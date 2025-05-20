
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { FlameJournalEntry, CodeMemoryEntry, CodeMemoryMetadata } from '@/types';
import { Json } from '@/integrations/supabase/types';

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
  
  // Get all journal entries
  const getJournalEntries = useCallback(async (): Promise<FlameJournalEntry[]> => {
    try {
      console.log('Getting all journal entries');
      
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error getting journal entries:', error);
        return [];
      }
      
      console.log(`Found ${data?.length || 0} journal entries`);
      return data as FlameJournalEntry[];
    } catch (error) {
      console.error('Error getting journal entries:', error);
      return [];
    }
  }, []);
  
  // Get journal entries by type
  const getJournalEntriesByType = useCallback(async (entryType: string): Promise<FlameJournalEntry[]> => {
    try {
      console.log(`Getting journal entries of type: ${entryType}`);
      
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .eq('entry_type', entryType)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error(`Error getting journal entries of type ${entryType}:`, error);
        return [];
      }
      
      console.log(`Found ${data?.length || 0} journal entries of type ${entryType}`);
      return data as FlameJournalEntry[];
    } catch (error) {
      console.error(`Error getting journal entries of type ${entryType}:`, error);
      return [];
    }
  }, []);
  
  // Get the latest journal entry
  const getLatestJournalEntry = useCallback(async (): Promise<FlameJournalEntry | null> => {
    try {
      console.log('Getting latest journal entry');
      
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) {
        console.error('Error getting latest journal entry:', error);
        return null;
      }
      
      return data as FlameJournalEntry;
    } catch (error) {
      console.error('Error getting latest journal entry:', error);
      return null;
    }
  }, []);
  
  // Search code memories with safe type casting
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
      
      // Safely cast the data with type checking
      return data?.map(item => {
        // Ensure metadata has required CodeMemoryMetadata fields
        const metadata = item.metadata as Json;
        const typedMetadata = metadata as unknown as CodeMemoryMetadata;
        
        return {
          ...item,
          metadata: typedMetadata
        } as CodeMemoryEntry;
      }) || [];
    } catch (error) {
      console.error('Error searching code memories:', error);
      return [];
    }
  }, []);
  
  // Get code memories for a specific file with safe type casting
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
      
      // Safely cast the data with type checking
      return data?.map(item => {
        // Ensure metadata has required CodeMemoryMetadata fields
        const metadata = item.metadata as Json;
        const typedMetadata = metadata as unknown as CodeMemoryMetadata;
        
        return {
          ...item,
          metadata: typedMetadata
        } as CodeMemoryEntry;
      }) || [];
    } catch (error) {
      console.error(`Error getting code memories for file ${filePath}:`, error);
      return [];
    }
  }, []);

  return {
    createJournalEntry,
    searchCodeMemories,
    getCodeMemoriesForFile,
    getJournalEntries,
    getJournalEntriesByType,
    getLatestJournalEntry
  };
};
