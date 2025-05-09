
import { useCallback, useEffect } from 'react';
import { FileEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to handle commit operations for GitHub
 */
export const useCommitPanel = (
  getModifiedFiles: () => FileEntry[],
  saveFileToRepo: (filePath: string, content: string, commitMessage: string) => Promise<boolean>,
  currentRepoName: string,
  currentBranch: string,
  startCommit: () => void,
  finishCommit: (success: boolean, error?: string) => void,
  updateEditedFiles: (files: FileEntry[]) => void
) => {
  const { toast } = useToast();

  // Update modified files on mount and when dependencies change
  useEffect(() => {
    if (currentRepoName && currentBranch) {
      const files = getModifiedFiles();
      updateEditedFiles(files);
    }
  }, [currentRepoName, currentBranch, getModifiedFiles, updateEditedFiles]);

  const handleCommit = useCallback(async () => {
    if (!currentRepoName || !currentBranch) {
      toast({
        title: "Cannot commit",
        description: "No repository or branch selected",
        variant: "destructive"
      });
      return;
    }

    try {
      startCommit();
      const modifiedFiles = getModifiedFiles();
      updateEditedFiles(modifiedFiles);
      
      if (modifiedFiles.length === 0) {
        finishCommit(false, "No files to commit");
        return;
      }

      console.log(`useCommitPanel - Starting commit of ${modifiedFiles.length} files to ${currentRepoName} (${currentBranch})`);
      
      // Track success and failures
      let successCount = 0;
      let failureCount = 0;
      let lastError = '';

      // Commit each file individually
      for (const file of modifiedFiles) {
        try {
          console.log(`useCommitPanel - Committing file: ${file.path}`);
          
          // Need to read file content
          const fileContent = file.content || '';
          if (!fileContent) {
            console.warn(`useCommitPanel - Empty content for file ${file.path}, skipping`);
            failureCount++;
            continue;
          }
          
          const success = await saveFileToRepo(file.path, fileContent, "Update file from Travis AI");
          
          if (success) {
            successCount++;
          } else {
            failureCount++;
            lastError = `Failed to commit ${file.path}`;
            console.error(`useCommitPanel - Failed to commit file: ${file.path}`);
          }
        } catch (error) {
          console.error(`useCommitPanel - Error committing file ${file.path}:`, error);
          failureCount++;
          lastError = error instanceof Error ? error.message : String(error);
        }
      }

      // Show appropriate toast message
      if (successCount > 0 && failureCount === 0) {
        toast({
          title: "Commit successful",
          description: `Successfully committed ${successCount} files`
        });
        finishCommit(true);
        
        // Refresh the modified files list
        setTimeout(() => {
          const remainingFiles = getModifiedFiles();
          updateEditedFiles(remainingFiles);
        }, 500);
      } else if (successCount > 0 && failureCount > 0) {
        toast({
          title: "Partial commit",
          description: `Committed ${successCount} files, ${failureCount} failed`,
          variant: "destructive"
        });
        finishCommit(false, `${failureCount} files failed to commit: ${lastError}`);
      } else {
        toast({
          title: "Commit failed",
          description: lastError || "Failed to commit files",
          variant: "destructive"
        });
        finishCommit(false, lastError || "Failed to commit files");
      }
    } catch (error) {
      console.error('useCommitPanel - Error in commit process:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      toast({
        title: "Commit error",
        description: errorMessage,
        variant: "destructive"
      });
      
      finishCommit(false, errorMessage);
    }
  }, [
    currentRepoName, 
    currentBranch, 
    getModifiedFiles, 
    saveFileToRepo,
    toast,
    startCommit,
    finishCommit,
    updateEditedFiles
  ]);

  return {
    handleCommit
  };
};
