
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useGitHubMemory } from './useGitHubMemory';

export const useGitHubSync = (
  syncRepo: (
    owner: string, 
    repo: string, 
    branch: string,
    createFile: (path: string, name: string, content: string) => Promise<void>,
    createFolder: (path: string, name: string) => Promise<void>
  ) => Promise<boolean>,
  userId?: string
) => {
  const { toast } = useToast();
  const { storeGitHubSync } = useGitHubMemory();

  // Sync repository to file system with improved error handling and state management
  const syncRepoToFileSystem = useCallback(async (
    owner: string, 
    repo: string, 
    branch: string,
    createFile: (path: string, name: string, content: string) => Promise<void>,
    createFolder: (path: string, name: string) => Promise<void>,
    refreshFiles: () => Promise<void>
  ): Promise<boolean> => {
    try {
      console.log(`useGitHubSync - Syncing repo ${owner}/${repo} (${branch}) to file system`);
      
      // Perform the sync operation
      const result = await syncRepo(owner, repo, branch, createFile, createFolder);
      
      // Only manually refresh if sync was successful and refreshFiles is provided
      if (result) {
        try {
          console.log('useGitHubSync - Sync successful, refreshing files');
          // Important: wrap in setTimeout to prevent state update cycles
          setTimeout(async () => {
            try {
              await refreshFiles();
              console.log('useGitHubSync - Files refreshed successfully');
            } catch (refreshError) {
              console.error('useGitHubSync - Error refreshing files after sync:', refreshError);
            }
          }, 500);
        } catch (refreshError) {
          console.error('useGitHubSync - Error refreshing files after sync:', refreshError);
          // Continue execution even if refresh fails - the sync was still successful
        }
      } else {
        console.log('useGitHubSync - Sync returned false, not refreshing files');
      }
      
      // Store sync operation in memory
      if (userId) {
        try {
          await storeGitHubSync(userId, owner, repo, branch, result);
        } catch (memoryError) {
          console.error('useGitHubSync - Error storing sync state in memory:', memoryError);
          // Continue execution even if memory storage fails
        }
      }
      
      return result;
    } catch (error) {
      console.error("useGitHubSync - Error in syncRepoToFileSystem:", error);
      return false;
    }
  }, [syncRepo, userId, storeGitHubSync]);

  return {
    syncRepoToFileSystem
  };
};
