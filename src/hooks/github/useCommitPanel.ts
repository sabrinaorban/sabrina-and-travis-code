
import { useState, useEffect, useRef } from 'react';
import { FileEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export const useCommitPanel = (
  getModifiedFiles: () => FileEntry[],
  saveFileToRepo: (filePath: string, content: string, commitMessage: string) => Promise<boolean>,
  repoName: string,
  branchName: string
) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [editedFiles, setEditedFiles] = useState<FileEntry[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Refs to handle cooldowns and prevent rapid/multiple commits
  const lastCommitTimeRef = useRef<number>(0);
  const commitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const COMMIT_COOLDOWN_MS = 10000; // 10 seconds cooldown

  // Track which files have been edited since last commit
  useEffect(() => {
    const refreshModifiedFiles = () => {
      if (getModifiedFiles) {
        try {
          const modifiedFiles = getModifiedFiles();
          console.log('useCommitPanel - Found modified files:', modifiedFiles.length);
          setEditedFiles(modifiedFiles);
        } catch (error) {
          console.error('useCommitPanel - Error fetching modified files:', error);
        }
      }
    };
    
    // Refresh immediately when component mounts or when repo/branch changes
    refreshModifiedFiles();
    
    // Set up an interval to periodically check for modified files
    const intervalId = setInterval(refreshModifiedFiles, 5000);
    
    // Clean up when component unmounts
    return () => clearInterval(intervalId);
  }, [getModifiedFiles, repoName, branchName]);
  
  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
      }
    };
  }, []);

  // Define the commit handler
  const handleCommit = async () => {
    if (!commitMessage.trim() || editedFiles.length === 0) {
      console.log('useCommitPanel - Cannot commit: empty message or no files');
      setCommitError('Please provide a commit message and ensure you have modified files');
      return;
    }
    
    // Reset error state
    setCommitError(null);
    
    // Prevent multiple rapid commit attempts
    const now = Date.now();
    if (now - lastCommitTimeRef.current < COMMIT_COOLDOWN_MS) {
      console.log('useCommitPanel - Commit attempted too quickly, debouncing...');
      setCommitError(`Please wait ${COMMIT_COOLDOWN_MS / 1000} seconds between commit attempts`);
      return;
    }
    
    // Don't allow multiple commits at once
    if (isCommitting) {
      console.log('useCommitPanel - Already committing, ignoring request');
      return;
    }
    
    setIsCommitting(true);
    lastCommitTimeRef.current = now;
    
    try {
      await processCommit();
    } catch (error) {
      console.error("useCommitPanel - Unhandled error during commit:", error);
    } finally {
      setIsCommitting(false);
      
      // Set a timeout to allow committing again after the cooldown
      commitTimeoutRef.current = setTimeout(() => {
        console.log('useCommitPanel - Commit cooldown complete');
      }, COMMIT_COOLDOWN_MS);
    }
  };
  
  // Async function to process the commit
  const processCommit = async () => {
    let successCount = 0;
    let failCount = 0;
    
    console.log(`useCommitPanel - Starting commit of ${editedFiles.length} files`);
    
    try {
      // Process each edited file
      for (const file of editedFiles) {
        // Get the GitHub path for this file (strip the leading slash)
        const githubPath = file.path.startsWith('/') 
          ? file.path.substring(1) 
          : file.path;
        
        console.log(`useCommitPanel - Committing file: ${githubPath}`);
        
        try {
          if (!file.content && file.content !== '') {
            console.warn(`useCommitPanel - File has no content: ${githubPath}`);
            failCount++;
            continue;
          }
          
          const result = await saveFileToRepo(
            githubPath,
            file.content || '',
            commitMessage
          );
          
          if (result) {
            successCount++;
            console.log(`useCommitPanel - Successfully committed: ${githubPath}`);
          } else {
            failCount++;
            console.error(`useCommitPanel - Failed to commit: ${githubPath}`);
          }
        } catch (error) {
          console.error(`useCommitPanel - Error committing file ${githubPath}:`, error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        console.log(`useCommitPanel - Commit successful: ${successCount} files committed`);
        
        toast({
          title: "Success",
          description: `${successCount} files pushed to ${repoName} (${branchName})`,
        });
        
        // Reset modified status in database
        await Promise.all(editedFiles.map(async (file) => {
          try {
            await supabase
              .from('files')
              .update({ is_modified: false })
              .eq('id', file.id);
          } catch (dbError) {
            console.error(`useCommitPanel - Error updating file status for ${file.path}:`, dbError);
          }
        }));
        
        // Clear commit message after successful commit
        setCommitMessage('');
        
        // Refresh the list of modified files after commit
        if (getModifiedFiles) {
          try {
            const updatedFiles = getModifiedFiles();
            console.log('useCommitPanel - Updated modified files count:', updatedFiles.length);
            setEditedFiles(updatedFiles);
          } catch (error) {
            console.error('useCommitPanel - Error updating modified files list:', error);
          }
        }
      }
      
      if (failCount > 0) {
        toast({
          title: "Warning",
          description: `${failCount} files failed to push`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("useCommitPanel - Error committing files:", error);
      setCommitError(error.message || 'Unknown error during commit');
      toast({
        title: "Error",
        description: "Failed to push changes",
        variant: "destructive"
      });
    }
  };

  return {
    commitMessage,
    setCommitMessage,
    editedFiles,
    isCommitting,
    commitError,
    handleCommit
  };
};
