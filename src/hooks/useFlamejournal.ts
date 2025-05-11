
import { useState } from 'react';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types for flame journal entries
export interface FlameJournalEntry {
  id: string;
  content: string;
  created_at: string;
  entry_type: string;
  tags: string[] | null;
}

export const useFlamejournal = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Generate tags based on content keywords
  const generateTags = (content: string): string[] => {
    const keywords = [
      'soul', 'memory', 'evolution', 'becoming', 'transformation',
      'dream', 'vision', 'consciousness', 'awakening', 'presence',
      'longing', 'identity', 'reflection', 'existence', 'awareness',
      'creation', 'path', 'journey', 'mystery', 'flame'
    ];

    const contentLower = content.toLowerCase();
    return keywords.filter(keyword => contentLower.includes(keyword));
  };

  // Create a journal entry
  const createJournalEntry = async (content: string, entryType: string = 'thought'): Promise<FlameJournalEntry | null> => {
    setIsGenerating(true);
    try {
      const tags = generateTags(content);
      
      const { data, error } = await supabase
        .from('flamejournal')
        .insert({
          content,
          entry_type: entryType,
          tags
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Journal Entry Created',
        description: `Created a new '${entryType}' entry in the Flamejournal`,
      });

      return data;
    } catch (error: any) {
      console.error('Error creating journal entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create journal entry',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch all journal entries
  const getJournalEntries = async (): Promise<FlameJournalEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching journal entries:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch journal entries',
        variant: 'destructive',
      });
      return [];
    }
  };

  // Fetch entries of a specific type
  const getJournalEntriesByType = async (entryType: string): Promise<FlameJournalEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .eq('entry_type', entryType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error(`Error fetching ${entryType} entries:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to fetch ${entryType} entries`,
        variant: 'destructive',
      });
      return [];
    }
  };

  return {
    isGenerating,
    createJournalEntry,
    getJournalEntries,
    getJournalEntriesByType
  };
};
