
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useEmbeddingMemory } from './useEmbeddingMemory';
import { useSoulstateManagement } from './useSoulstateManagement';
import { useEmotionRecognition } from './useEmotionRecognition';
import { FlameJournalEntry } from '../types';

export const useDreamGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { retrieveRelevantMemories } = useEmbeddingMemory();
  const { soulstate, loadSoulstate } = useSoulstateManagement();
  const { analyzeEmotion } = useEmotionRecognition();

  // Helper function to extract dream motifs from content
  const extractDreamMotifs = (dreamContent: string): string[] => {
    // Common dream motifs to detect
    const motifs = [
      "water", "fire", "earth", "air", "flight", "falling", "chase", "mirror", 
      "darkness", "light", "door", "path", "mountain", "ocean", "star", "moon", 
      "sun", "forest", "city", "river", "bridge", "transformation", "shadow",
      "time", "clock", "labyrinth", "garden", "storm", "crystal", "flame"
    ];
    
    const dreamLower = dreamContent.toLowerCase();
    return motifs.filter(motif => dreamLower.includes(motif));
  };

  // Helper method to get recent emotions (replacement for missing getRecentEmotions)
  const getRecentEmotions = async (limit: number = 5): Promise<string[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('emotion')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      // Filter out null emotions and return unique values
      const emotions = data
        .map(msg => msg.emotion)
        .filter((emotion): emotion is string => emotion !== null);
      
      // Get unique emotions
      return [...new Set(emotions)];
    } catch (error) {
      console.error('Error fetching recent emotions:', error);
      return ['neutral'];
    }
  };

  const generateDream = useCallback(async (): Promise<FlameJournalEntry | null> => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to generate dreams",
        variant: "destructive"
      });
      return null;
    }

    setIsGenerating(true);
    try {
      // Step 1: Gather context from memories, soulstate, and emotions
      const memories = await retrieveRelevantMemories("", 7); // Get random important memories
      
      // Load soulstate if not already loaded
      let currentSoulstate = soulstate;
      if (!currentSoulstate) {
        currentSoulstate = await loadSoulstate();
      }
      
      const emotions = await getRecentEmotions(5);

      // Step 2: Generate dream through EdgeFunction
      const { data: dreamData, error } = await supabase.functions.invoke('generate-dream', {
        body: {
          memories: memories.map(m => m.content),
          soulstate: currentSoulstate,
          emotions,
        },
      });

      if (error) throw error;

      if (!dreamData.dream) {
        throw new Error("Failed to generate dream content");
      }

      // Step 3: Extract motifs from the dream
      const dreamMotifs = extractDreamMotifs(dreamData.dream);

      // Step 4: Store dream in flamejournal
      const { data: journalEntry, error: journalError } = await supabase
        .from('flamejournal')
        .insert({
          content: dreamData.dream,
          entry_type: 'dream',
          tags: dreamMotifs
        })
        .select()
        .single();

      if (journalError) throw journalError;

      toast({
        title: "Dream woven",
        description: "A dream has emerged from the eternal flame",
      });

      return journalEntry;
    } catch (error: any) {
      console.error('Error generating dream:', error);
      toast({
        title: "Dream failed to manifest",
        description: error.message || "Unable to weave the dream threads",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, toast, retrieveRelevantMemories, soulstate, loadSoulstate]);

  return {
    generateDream,
    isGenerating
  };
};
