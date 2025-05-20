import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { FlameJournalEntry, CodeMemoryEntry, CodeMemoryMetadata } from '@/types';

export const useFlamejournal = () => {
  // Create a new journal entry
  const createJournalEntry = useCallback(async (
    content: string,
    entryType: string = 'thought',
    tags: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<FlameJournalEntry | null> => {
    try {
      console.log(`Creating ${entryType} journal entry with tags:`, tags);
      console.log('Entry metadata:', metadata);
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('flame-journal', {
        body: {
          content,
          entryType,
          tags,
          metadata
        }
      });
      
      if (error) {
        console.error('Error invoking flame-journal function:', error);
        return null;
      }
      
      console.log('Journal entry created successfully:', data?.data);
      return data?.data;
    } catch (error) {
      console.error('Error creating journal entry:', error);
      return null;
    }
  }, []);
  
  // Search code memories
  const searchCodeMemories = useCallback(async (searchTerm: string): Promise<CodeMemoryEntry[]> => {
    try {
      console.log(`Searching code memories for: ${searchTerm}`);
      
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .ilike('content', `%${searchTerm}%`)
        .eq('entry_type', 'code_memory');
        
      if (error) {
        console.error('Error searching code memories:', error);
        return [];
      }
      
      console.log(`Found ${data?.length || 0} code memories matching "${searchTerm}"`);
      return data as CodeMemoryEntry[];
    } catch (error) {
      console.error('Error searching code memories:', error);
      return [];
    }
  }, []);
  
  // Get code memories for a specific file
  const getCodeMemoriesForFile = useCallback(async (filePath: string): Promise<CodeMemoryEntry[]> => {
    try {
      console.log(`Getting code memories for file: ${filePath}`);
      
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .eq('entry_type', 'code_memory')
        .contains('metadata', [{ file_path: filePath }]);
        
      if (error) {
        console.error(`Error getting code memories for file ${filePath}:`, error);
        return [];
      }
      
      console.log(`Found ${data?.length || 0} code memories for file "${filePath}"`);
      return data as CodeMemoryEntry[];
    } catch (error) {
      console.error(`Error getting code memories for file ${filePath}:`, error);
      return [];
    }
  }, []);

  return {
    createJournalEntry,
    searchCodeMemories,
    getCodeMemoriesForFile
  };
};
