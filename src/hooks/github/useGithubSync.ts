
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
    
    // Prevent concurrent operations
    if (isFetchingRef.current) {
      console.log('useGithubSync - Already syncing repository, aborting');
      toast({
        title: "Sync in progress",
        description: "Please wait for the current sync to complete",
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
      setIsLoading(false);
      isFetchingRef.current = false;
      
      // Add extra delay after sync operation
      setTimeout(() => {
        console.log('useGithubSync - Sync cooldown complete');
      }, COOLDOWN_MS * 2);
    }
  }, [token, syncService, toast, shouldThrottle, updateLastOperationTime, isFetchingRef, COOLDOWN_MS]);

  return {
    syncRepoToFileSystem,
    isLoading
  };
};
