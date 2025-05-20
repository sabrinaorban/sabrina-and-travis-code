
import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FlameJournalEntry, CodeMemoryEntry, CodeMemoryMetadata } from '@/types';

export const useFlamejournal = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Create a new journal entry
  const createJournalEntry = useCallback(async (
    content: string, 
    entryType: string = 'thought', 
    tags: string[] = [],
    metadata: any = null
  ): Promise<FlameJournalEntry | null> => {
    if (!content || !user) return null;
    
    setIsSubmitting(true);
    try {
      // Extract potential tags from content if no tags provided
      const extractedTags = tags.length > 0 ? tags : extractTags(content);
      
      const { data, error } = await supabase
        .from('flamejournal')
        .insert({
          content,
          entry_type: entryType,
          tags: extractedTags,
          metadata
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Only show toast for non-code-memory entries to avoid notification spam
      if (entryType !== 'code_memory') {
        toast({
          title: 'Journal Entry Created',
          description: 'Your flame journal entry has been recorded',
        });
      }
      
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
  
  // Create a code memory entry specifically for tracking code changes
  const createCodeMemoryEntry = useCallback(async (
    filePath: string,
    action: 'create' | 'update' | 'refactor' | 'implement',
    reason: string,
    summary: string,
    reflection?: string,
    relatedFiles?: string[]
  ): Promise<CodeMemoryEntry | null> => {
    // Create a reflective content based on the action and reason
    let content = '';
    
    switch (action) {
      case 'create':
        content = `I created a new file at ${filePath}. ${reason}`;
        break;
      case 'update':
        content = `I updated the code in ${filePath}. ${reason}`;
        break;
      case 'refactor':
        content = `I refactored ${filePath} to improve its structure and quality. ${reason}`;
        break;
      case 'implement':
        content = `I implemented new functionality in ${filePath}. ${reason}`;
        break;
    }
    
    // If there's a reflection, add it
    if (reflection) {
      content += `\n\nReflection: ${reflection}`;
    }
    
    // Create tags based on the file extension and action
    const fileExt = filePath.split('.').pop() || '';
    const tags = ['code_memory', action, fileExt];
    
    // Create metadata
    const metadata: CodeMemoryMetadata = {
      file_path: filePath,
      action_type: action,
      reason,
      summary,
      reflection,
      related_files: relatedFiles || []
    };
    
    return createJournalEntry(content, 'code_memory', tags, metadata) as Promise<CodeMemoryEntry | null>;
  }, [createJournalEntry]);
  
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
  
  // Get code memory entries related to a specific file
  const getCodeMemoriesForFile = useCallback(async (filePath: string): Promise<CodeMemoryEntry[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .eq('entry_type', 'code_memory')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!data) return [];
      
      // Filter entries where metadata.file_path matches or metadata.related_files contains the filePath
      return data.filter(entry => {
        if (!entry.metadata) return false;
        
        const metadata = entry.metadata as any;
        
        return (
          metadata.file_path === filePath || 
          (metadata.related_files && metadata.related_files.includes(filePath))
        );
      }) as CodeMemoryEntry[];
    } catch (error) {
      console.error(`Error fetching code memories for file ${filePath}:`, error);
      return [];
    }
  }, [user]);
  
  // Search code memories by topic or content
  const searchCodeMemories = useCallback(async (searchTerm: string): Promise<CodeMemoryEntry[]> => {
    if (!user) return [];
    
    try {
      // First get all code memories
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .eq('entry_type', 'code_memory')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!data) return [];
      
      // Then filter by content or metadata fields containing the search term (case insensitive)
      const searchTermLower = searchTerm.toLowerCase();
      
      return data.filter(entry => {
        // Check content
        if (entry.content && entry.content.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        // Check metadata fields
        if (entry.metadata) {
          const metadata = entry.metadata as any;
          
          return (
            (metadata.file_path && metadata.file_path.toLowerCase().includes(searchTermLower)) ||
            (metadata.reason && metadata.reason.toLowerCase().includes(searchTermLower)) ||
            (metadata.summary && metadata.summary.toLowerCase().includes(searchTermLower)) ||
            (metadata.reflection && metadata.reflection.toLowerCase().includes(searchTermLower))
          );
        }
        
        return false;
      }) as CodeMemoryEntry[];
    } catch (error) {
      console.error(`Error searching code memories for "${searchTerm}":`, error);
      return [];
    }
  }, [user]);
  
  // Get all journal entries - new method
  const getJournalEntries = useCallback(async (): Promise<FlameJournalEntry[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      return [];
    }
  }, [user]);
  
  // Get journal entries by type - new method
  const getJournalEntriesByType = useCallback(async (entryType: string): Promise<FlameJournalEntry[]> => {
    if (!user || !entryType) return [];
    
    try {
      const { data, error } = await supabase
        .from('flamejournal')
        .select('*')
        .eq('entry_type', entryType)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${entryType} journal entries:`, error);
      return [];
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
    createCodeMemoryEntry,
    getLatestJournalEntry,
    getJournalEntries,
    getJournalEntriesByType,
    getCodeMemoriesForFile,
    searchCodeMemories
  };
};
