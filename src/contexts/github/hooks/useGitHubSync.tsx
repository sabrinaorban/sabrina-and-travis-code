
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to manage GitHub repository synchronization
 */
export const useGitHubContextSync = (
  syncRepoToFileSystem: (owner: string, repo: string, branch: string, createFile: any, createFolder: any, refreshFiles: any) => Promise<boolean>,
  userId?: string
) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncState, setLastSyncState] = useState<{ isSuccessful: boolean; timestamp: number } | null>(null);
  
  // Create a ref to track if a sync is already in progress
  const syncInProgressRef = useRef<boolean>(false);
  const { toast } = useToast();

  // Get last sync state
  const getLastSyncState = () => {
    return lastSyncState;
  };

  // Reset sync state
  const resetSyncState = () => {
    setLastSyncState(null);
  };

  // Create a wrapper for syncRepoToFileSystem that includes sync state tracking
  const handleSyncRepoToFileSystem = async (
    owner: string,
    repo: string,
    branch: string,
    createFile: any,
    createFolder: any,
    refreshFiles: any
  ): Promise<boolean> => {
    // If a sync is already in progress, prevent starting another
    if (syncInProgressRef.current) {
      console.log('useGitHubContextSync - Sync already in progress, aborting new sync request');
      toast({
        title: "Sync in progress",
        description: "Please wait for the current sync operation to complete",
      });
      return false;
    }

    try {
      // Set sync flags
      syncInProgressRef.current = true;
      setIsSyncing(true);
      
      console.log(`useGitHubContextSync - Starting sync of ${owner}/${repo} (${branch})`);
      
      // Execute the sync operation
      const result = await syncRepoToFileSystem(owner, repo, branch, createFile, createFolder, refreshFiles);
      
      // Update sync state
      setLastSyncState({
        isSuccessful: result,
        timestamp: Date.now()
      });
      
      // Give user feedback
      if (result) {
        toast({
          title: "Sync completed",
          description: `Repository ${repo} has been successfully imported`,
        });
      } else {
        toast({
          title: "Sync failed",
          description: `Failed to import repository ${repo}`,
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error) {
      console.error("useGitHubContextSync - Error in syncRepoToFileSystem:", error);
      setLastSyncState({
        isSuccessful: false,
        timestamp: Date.now()
      });
      
      toast({
        title: "Sync error",
        description: `An unexpected error occurred while importing the repository`,
        variant: "destructive",
      });
      
      return false;
    } finally {
      // Reset sync flags with a small delay to prevent immediate re-triggering
      setTimeout(() => {
        syncInProgressRef.current = false;
        setIsSyncing(false);
      }, 1000);
    }
  };
  
  return {
    isSyncing,
    getLastSyncState,
    resetSyncState,
    handleSyncRepoToFileSystem
  };
};
