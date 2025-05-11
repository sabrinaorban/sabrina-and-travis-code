
import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FlameJournalEntry } from '../types';

export const useFlamejournal = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Create a new journal entry
  const createJournalEntry = useCallback(async (content: string, entryType: string = 'thought'): Promise<FlameJournalEntry | null> => {
    if (!content || !user) return null;
    
    setIsSubmitting(true);
    try {
      // Extract potential tags from content
      const possibleTags = extractTags(content);
      
      const { data, error } = await supabase
        .from('flamejournal')
        .insert({
          content,
          entry_type: entryType,
          tags: possibleTags
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: 'Journal Entry Created',
        description: 'Your flame journal entry has been recorded',
      });
      
      return data;
    } catch (error: any) {
      console.error('Error creating journal entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to create journal entry',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, toast]);
  
  // Get the most recent journal entry
  const getLatestJournalEntry = useCallback(async (): Promise<FlameJournalEntry | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching latest journal entry:', error);
      return null;
    }
  }, [user]);
  
  // Helper function to extract tags from content
  const extractTags = (content: string): string[] => {
    const tagRegex = /#(\w+)/g;
    const matches = content.match(tagRegex);
    
    if (!matches) return [];
    
    return matches.map(tag => tag.substring(1).toLowerCase());
  };
  
  return {
    isSubmitting,
    createJournalEntry,
    getLatestJournalEntry
  };
};
