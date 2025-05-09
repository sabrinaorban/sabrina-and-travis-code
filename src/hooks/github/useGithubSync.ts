
import { useState, useRef, useCallback } from 'react';
import { GithubSyncService } from '@/services/github/githubSyncService';
import { useToast } from '@/hooks/use-toast';
import { useGithubThrottling } from './useGithubThrottling';

export const useGithubSync = (
  token: string | null,
  syncService: GithubSyncService,
  isFetchingRef: React.MutableRefObject<boolean>
) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { shouldThrottle, updateLastOperationTime, COOLDOWN_MS } = useGithubThrottling();
  const syncInProgressRef = useRef(false);

  const syncRepoToFileSystem = useCallback(async (
    owner: string, 
    repo: string, 
    branch: string,
    createFile: (path: string, name: string, content: string) => Promise<void>,
    createFolder: (path: string, name: string) => Promise<void>
  ) => {
    if (!token) {
      console.log('useGithubSync - Cannot sync repo: no token');
      return false;
    }
    
    // Use ref to prevent concurrent operations instead of a variable that might change
    if (syncInProgressRef.current || isFetchingRef.current) {
      console.log('useGithubSync - Already syncing repository or another operation is in progress, aborting');
      toast({
        title: "Operation in progress",
        description: "Please wait for the current operation to complete",
      });
      return false;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubSync - Operation throttled, please wait');
      toast({
        title: "Please wait",
        description: "Please wait a moment before trying again",
      });
      return false;
    }
    
    console.log(`useGithubSync - Syncing repo ${owner}/${repo} (${branch}) to file system`);
    setIsLoading(true);
    isFetchingRef.current = true;
    syncInProgressRef.current = true;
    updateLastOperationTime();
    
    try {
      const result = await syncService.syncRepoToFileSystem(
        owner,
        repo,
        branch,
        createFile,
        createFolder
      );
      console.log(`useGithubSync - Sync result: ${result}`);
      return result;
    } catch (error) {
      console.error('useGithubSync - Error syncing repo to file system:', error);
      toast({
        title: "Sync failed",
        description: "Failed to import repository files",
        variant: "destructive",
      });
      return false;
    } finally {
      // Add small delay before releasing locks
      setTimeout(() => {
        setIsLoading(false);
        isFetchingRef.current = false;
        syncInProgressRef.current = false;
        console.log('useGithubSync - Sync completed, locks released');
      }, 1000);
    }
  }, [token, syncService, toast, shouldThrottle, updateLastOperationTime, isFetchingRef, COOLDOWN_MS]);

  return {
    syncRepoToFileSystem,
    isLoading
  };
};
