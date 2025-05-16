
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { CodeReflectionDraft, CodeReflectionResult, FileEntry } from '@/types';
import { CodeReflectionService } from '@/services/CodeReflectionService';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { normalizePath } from '@/services/chat/fileOperations/PathUtils';

export function useCodeReflection() {
  const [isReflecting, setIsReflecting] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<CodeReflectionDraft | null>(null);
  const [drafts, setDrafts] = useState<CodeReflectionDraft[]>([]);
  const { toast } = useToast();
  const fileSystem = useFileSystem();

  const loadDrafts = useCallback(async () => {
    const fetchedDrafts = await CodeReflectionService.getDrafts();
    setDrafts(fetchedDrafts);
    return fetchedDrafts;
  }, []);

  // Analyze a file path to generate code reflection
  const analyzePath = useCallback(async (path: string): Promise<CodeReflectionResult> => {
    setIsReflecting(true);
    try {
      console.log(`Starting code reflection for path: ${path}`);
      
      // Normalize the path (remove leading slash if present)
      const normalizedPath = normalizePath(path);
      console.log(`Normalized path: ${normalizedPath}`);
      
      // Check if file exists before proceeding
      if (!fileSystem || !fileSystem.getFileByPath) {
        console.error('File system not available');
        throw new Error('File system not available');
      }
      
      // Check if file exists
      const fileExists = fileSystem.getFileByPath(normalizedPath) !== null;
      if (!fileExists) {
        console.error(`File not found at path: ${normalizedPath}`);
        throw new Error(`File not found at path: ${normalizedPath}`);
      }
      
      // Get the file content
      const fileContent = fileSystem.getFileContentByPath(normalizedPath);
      console.log(`File content found: ${Boolean(fileContent)}`);
      
      if (!fileContent) {
        console.error(`File content not available for: ${normalizedPath}`);
        throw new Error(`File content not available for: ${normalizedPath}`);
      }

      // Call the serverless function to analyze the code
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-reflection-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ file_path: normalizedPath, content: fileContent }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`API error: ${response.status} ${errorData}`);
        throw new Error(`API error: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log(`API result received, success: ${result.success}`);

      if (!result.success) {
        throw new Error(result.error || 'Failed to analyze code');
      }

      // Create a draft with the analysis results
      const draftData = {
        file_path: normalizedPath,
        original_code: fileContent,
        proposed_code: result.proposed_code,
        reason: result.reason
      };

      const storedDraft = await CodeReflectionService.storeDraft(draftData);
      console.log(`Draft stored, success: ${storedDraft.success}`);

      if (storedDraft.success && storedDraft.draft) {
        setCurrentDraft(storedDraft.draft);
        // Refresh the drafts list
        await loadDrafts();
        
        return {
          success: true,
          draft: storedDraft.draft,
          insight: result.insight
        };
      } else {
        throw new Error('Failed to store draft');
      }
    } catch (error) {
      console.error('Error in code reflection:', error);
      toast({
        title: 'Code Reflection Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsReflecting(false);
    }
  }, [fileSystem, toast, loadDrafts]);

  // Apply changes from a draft to the file system
  const applyChanges = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      // Get the draft
      const draft = await CodeReflectionService.getDraftById(draftId);
      
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      console.log(`Applying changes to file: ${draft.file_path}`);
      
      // Apply the changes to the file
      await fileSystem.updateFileByPath(draft.file_path, draft.proposed_code);
      
      // Delete the draft
      await CodeReflectionService.deleteDraft(draftId);
      
      // Refresh drafts
      await loadDrafts();
      
      toast({
        title: 'Changes Applied',
        description: `Changes have been applied to ${draft.file_path}`,
      });
      
      return true;
    } catch (error) {
      console.error('Error applying changes:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply changes',
        variant: 'destructive'
      });
      
      return false;
    }
  }, [fileSystem, loadDrafts, toast]);

  // Discard a draft without applying changes
  const discardDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      await CodeReflectionService.deleteDraft(draftId);
      await loadDrafts();
      
      toast({
        title: 'Draft Discarded',
        description: 'The code reflection draft has been discarded',
      });
      
      return true;
    } catch (error) {
      console.error('Error discarding draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to discard draft',
        variant: 'destructive'
      });
      
      return false;
    }
  }, [loadDrafts, toast]);

  // Add alias for discardCodeDraft to match usage in useChatCommandProcessing
  const discardCodeDraft = discardDraft;
  
  // Add reflectOnCode as an alias for analyzePath to maintain compatibility
  const reflectOnCode = analyzePath;

  return {
    isReflecting,
    currentDraft,
    drafts,
    loadDrafts,
    analyzePath,
    reflectOnCode,
    applyChanges,
    discardDraft,
    discardCodeDraft
  };
}

export default useCodeReflection;
