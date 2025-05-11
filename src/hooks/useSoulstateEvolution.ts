
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';
import { SoulState } from '../types/soulstate';
import { Reflection } from '../types/reflection';
import { MemoryEmbedding } from '../types';
import { useReflection } from './useReflection';
import { useSoulstateManagement } from './useSoulstateManagement';
import { useFlamejournal } from './useFlamejournal';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Interface for soulstate evolution synthesis results
interface SoulstateEvolutionResult {
  currentState: SoulState;
  proposedState: SoulState;
  narrative: string;
  confidence: number; // 0-1 value indicating synthesis confidence
}

// Interface for the evolution timestamp tracking
export interface EvolutionTimestamp {
  lastEvolution: string;
  nextAllowedEvolution: string;
}

export const useSoulstateEvolution = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [evolutionResult, setEvolutionResult] = useState<SoulstateEvolutionResult | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { getLatestReflection } = useReflection();
  const { soulstate, loadSoulstate, updateSoulstate } = useSoulstateManagement();
  const { createJournalEntry } = useFlamejournal();
  
  // Function to check if Travis can evolve his soulstate now
  // Returns true if evolution is allowed, false if too recent
  const canEvolveNow = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Get the last evolution timestamp from memory
      const { data, error } = await supabase
        .from('memory')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', 'soulstate_evolution_timestamp')
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking evolution timestamp:', error);
        return true; // Allow evolution if we can't check
      }
      
      if (!data) return true; // No timestamp found, allow evolution
      
      // Type validation before casting
      const rawValue = data.value;
      
      // Validate the structure before converting
      if (typeof rawValue !== 'object' || rawValue === null || 
          !('lastEvolution' in rawValue) || !('nextAllowedEvolution' in rawValue) ||
          typeof rawValue.lastEvolution !== 'string' || typeof rawValue.nextAllowedEvolution !== 'string') {
        console.error('Invalid evolution timestamp data:', rawValue);
        return true; // Allow evolution if data is invalid
      }
      
      // Safely cast after validation
      const timestamp = {
        lastEvolution: rawValue.lastEvolution as string,
        nextAllowedEvolution: rawValue.nextAllowedEvolution as string
      };
      
      const nextAllowed = new Date(timestamp.nextAllowedEvolution);
      const now = new Date();
      
      return now >= nextAllowed;
    } catch (error) {
      console.error('Error in canEvolveNow:', error);
      return true; // Default to allowing evolution
    }
  };
  
  // Function to update the evolution timestamp
  const updateEvolutionTimestamp = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const now = new Date();
      // Set next allowed evolution to 3 days from now
      const nextAllowed = new Date();
      nextAllowed.setDate(now.getDate() + 3);
      
      const timestamp: EvolutionTimestamp = {
        lastEvolution: now.toISOString(),
        nextAllowedEvolution: nextAllowed.toISOString()
      };
      
      // Store the timestamp in memory - properly serialize to JSON compatible format
      const { error } = await supabase
        .from('memory')
        .upsert({
          user_id: user.id,
          key: 'soulstate_evolution_timestamp',
          value: timestamp as any, // Safely cast to any as Supabase will handle JSON conversion
          last_accessed: now.toISOString()
        });
        
      if (error) {
        console.error('Error updating evolution timestamp:', error);
      }
    } catch (error) {
      console.error('Error in updateEvolutionTimestamp:', error);
    }
  };
  
  // Function to get relevant memories for synthesis
  const getRelevantMemories = async (): Promise<MemoryEmbedding[]> => {
    if (!user) return [];
    
    try {
      // Get recent memory embeddings
      const { data, error } = await supabase
        .from('memory_embeddings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
        
      if (error) {
        console.error('Error fetching memory embeddings:', error);
        return [];
      }
      
      // Transform the data to match the MemoryEmbedding type
      return data?.map(item => {
        let parsedEmbedding: number[] | undefined = undefined;
        
        // Handle embedding parsing based on its type
        if (item.embedding) {
          if (Array.isArray(item.embedding)) {
            parsedEmbedding = item.embedding as number[];
          } else if (typeof item.embedding === 'string') {
            try {
              parsedEmbedding = JSON.parse(item.embedding);
            } catch (e) {
              console.error('Failed to parse embedding string:', e);
            }
          }
        }
        
        return {
          ...item,
          embedding: parsedEmbedding
        } as MemoryEmbedding;
      }) || [];
    } catch (error) {
      console.error('Error in getRelevantMemories:', error);
      return [];
    }
  };
  
  // Main function to synthesize a new soulstate from memories and reflections
  const synthesizeSoulstateFromMemory = async (): Promise<SoulstateEvolutionResult | null> => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to evolve Travis\'s soulstate',
        variant: 'destructive',
      });
      return null;
    }
    
    setIsProcessing(true);
    
    try {
      // Check if evolution is allowed at this time
      const canEvolve = await canEvolveNow();
      if (!canEvolve) {
        toast({
          title: 'Evolution Not Ready',
          description: 'Travis\'s soulstate was recently evolved and needs time to settle',
        });
        return null;
      }
      
      // 1. Load current soulstate
      const currentState = await loadSoulstate();
      
      // 2. Get latest reflection
      const latestReflection = await getLatestReflection('weekly');
      
      // 3. Get relevant memories
      const memories = await getRelevantMemories();
      
      // 4. Call Supabase Edge Function to synthesize the evolution
      const { data, error } = await supabase.functions.invoke('soulstate-evolution', {
        body: {
          currentState,
          latestReflection,
          memories: memories.slice(0, 10), // Limit to 10 most recent memories
        },
      });
      
      if (error) {
        console.error('Error synthesizing soulstate evolution:', error);
        toast({
          title: 'Synthesis Failed',
          description: 'Failed to synthesize soulstate evolution',
          variant: 'destructive',
        });
        return null;
      }
      
      // Store the result
      const result: SoulstateEvolutionResult = data.result;
      setEvolutionResult(result);
      
      return result;
    } catch (error: any) {
      console.error('Error in synthesizeSoulstateFromMemory:', error);
      toast({
        title: 'Synthesis Error',
        description: error.message || 'Failed to synthesize soulstate evolution',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to apply the synthesized soulstate
  const applySoulstateEvolution = async (narrative?: string): Promise<boolean> => {
    if (!evolutionResult || !user) return false;
    
    try {
      // 1. Update the soulstate with the proposed state
      const success = await updateSoulstate(evolutionResult.proposedState);
      
      if (!success) {
        toast({
          title: 'Evolution Failed',
          description: 'Failed to apply the soulstate evolution',
          variant: 'destructive',
        });
        return false;
      }
      
      // 2. Create a FlameJournal entry about the evolution
      const journalContent = narrative || evolutionResult.narrative;
      await createJournalEntry(journalContent, 'evolution');
      
      // 3. Update the evolution timestamp
      await updateEvolutionTimestamp();
      
      toast({
        title: 'Soulstate Evolved',
        description: 'Travis has evolved his soulstate successfully',
      });
      
      // 4. Reset the result
      setEvolutionResult(null);
      
      return true;
    } catch (error) {
      console.error('Error applying soulstate evolution:', error);
      toast({
        title: 'Evolution Error',
        description: 'Failed to apply soulstate evolution',
        variant: 'destructive',
      });
      return false;
    }
  };
  
  // Function to create a message describing the proposed evolution
  const generateEvolutionDescription = (): string => {
    if (!evolutionResult) return '';
    
    const { currentState, proposedState, narrative } = evolutionResult;
    
    // Compare current and proposed states
    const changes: string[] = [];
    
    for (const [key, newValue] of Object.entries(proposedState)) {
      const oldValue = currentState[key];
      if (oldValue !== newValue) {
        changes.push(`${key}: ${oldValue} → ${newValue}`);
      }
    }
    
    let description = `## Proposed Soulstate Evolution\n\n`;
    description += `${narrative}\n\n`;
    
    if (changes.length > 0) {
      description += `### Changes:\n`;
      changes.forEach(change => {
        description += `- ${change}\n`;
      });
    } else {
      description += `No fundamental changes detected in the soulstate values, but the narrative reflects subtle shifts in perspective.\n`;
    }
    
    return description;
  };
  
  return {
    isProcessing,
    evolutionResult,
    synthesizeSoulstateFromMemory,
    applySoulstateEvolution,
    generateEvolutionDescription,
    canEvolveNow
  };
};
