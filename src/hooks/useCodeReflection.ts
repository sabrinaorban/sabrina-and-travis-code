
import { useState, useCallback } from 'react';
import { CodeReflectionDraft, CodeReflectionResult } from '@/types/code-reflection';
import { CodeReflectionService } from '@/services/CodeReflectionService';
import { useFileOperations } from '@/hooks/useFileOperations';
import { useFileRefresh } from '@/hooks/useFileRefresh';
import { useToast } from '@/hooks/use-toast';
import { useFlamejournal } from '@/hooks/useFlamejournal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { FileSystemContext } from '@/contexts/FileSystemContext';
import { useContext } from 'react';

export const useCodeReflection = () => {
  const [isReflecting, setIsReflecting] = useState<boolean>(false);
  const [currentDraft, setCurrentDraft] = useState<CodeReflectionDraft | null>(null);
  const { toast } = useToast();
  const { createJournalEntry } = useFlamejournal();
  const { user } = useAuth();
  const fileSystem = useContext(FileSystemContext);
  
  /**
   * Scan a directory or file and generate a reflection
   */
  const reflectOnCode = useCallback(async (path: string): Promise<CodeReflectionResult> => {
    if (!user?.id || !fileSystem) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to use code reflection',
        variant: 'destructive',
      });
      return { success: false, error: 'Authentication required' };
    }

    setIsReflecting(true);
    try {
      // Get file content
      const fileResponse = await fileSystem.readFile(path);
      if (!fileResponse.success) {
        throw new Error(`Could not read file: ${path}`);
      }

      const fileContent = fileResponse.content;
      
      // Call OpenAI function to analyze code and suggest improvements
      const { data, error } = await supabase.functions.invoke('code-reflection-analysis', {
        body: {
          file_path: path,
          content: fileContent
        }
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze code');
      }

      // Store the draft in the database
      const storeResult = await CodeReflectionService.storeDraft({
        file_path: path,
        original_code: fileContent,
        proposed_code: data.proposed_code,
        reason: data.reason
      });

      if (!storeResult.success) {
        throw new Error(storeResult.error || 'Failed to store code reflection draft');
      }

      // Create a journal entry for this reflection
      await createJournalEntry(
        `Code Reflection: ${path}\n\nInsight: ${data.insight}\n\nReason for change: ${data.reason}`, 
        'code_reflection',
        ['code', 'reflection', 'evolution']
      );

      setCurrentDraft(storeResult.draft);
      
      return {
        success: true,
        draft: storeResult.draft,
        insight: data.insight
      };
    } catch (error) {
      console.error('Error during code reflection:', error);
      toast({
        title: 'Reflection Failed',
        description: error.message || 'Failed to reflect on code',
        variant: 'destructive',
      });
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      setIsReflecting(false);
    }
  }, [user, fileSystem, toast, createJournalEntry]);

  /**
   * Approve and apply a code draft
   */
  const applyCodeDraft = useCallback(async (draftId: string): Promise<boolean> => {
    if (!user?.id || !fileSystem) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to apply code changes',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Get the draft
      const draft = await CodeReflectionService.getDraftById(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }

      // Update the file with the proposed code
      const writeResult = await fileSystem.writeFile(
        draft.file_path,
        draft.proposed_code
      );

      if (!writeResult.success) {
        throw new Error(`Failed to write changes to ${draft.file_path}`);
      }

      // Create a journal entry about applying the code change
      await createJournalEntry(
        `Applied code evolution to ${draft.file_path}:\n\nReason: ${draft.reason}`, 
        'code_evolution',
        ['code', 'evolution', 'applied']
      );

      toast({
        title: 'Code Evolution Applied',
        description: `Successfully updated ${draft.file_path}`,
      });

      return true;
    } catch (error) {
      console.error('Error applying code draft:', error);
      toast({
        title: 'Evolution Failed',
        description: error.message || 'Failed to apply code changes',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, fileSystem, toast, createJournalEntry]);

  /**
   * Discard a code draft
   */
  const discardCodeDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      const result = await CodeReflectionService.deleteDraft(draftId);
      
      if (result) {
        toast({
          title: 'Draft Discarded',
          description: 'The code evolution draft has been discarded',
        });
        return true;
      } else {
        throw new Error('Failed to discard draft');
      }
    } catch (error) {
      console.error('Error discarding code draft:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to discard draft',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    reflectOnCode,
    applyCodeDraft,
    discardCodeDraft,
    isReflecting,
    currentDraft,
    getDrafts: CodeReflectionService.getDrafts,
    getDraftById: CodeReflectionService.getDraftById
  };
};
