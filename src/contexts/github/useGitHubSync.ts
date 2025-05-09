
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

  // Sync repository to file system
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
      const result = await syncRepo(owner, repo, branch, createFile, createFolder);
      
      // Only manually refresh once
      if (result) {
        // Single manual refresh after sync
        console.log('useGitHubSync - Sync successful, refreshing files');
        await refreshFiles();
      } else {
        console.log('useGitHubSync - Sync returned false, not refreshing files');
      }
      
      // Store sync operation in memory
      if (userId) {
        await storeGitHubSync(userId, owner, repo, branch, result);
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
