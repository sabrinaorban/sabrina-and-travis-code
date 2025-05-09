
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useRepoSync = (
  syncRepoToFileSystem: (owner: string, repo: string, branch: string) => Promise<boolean>,
  deleteAllFiles: () => Promise<void>
) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  // Track the last sync attempt time to prevent rapid clicking
  const lastSyncAttemptRef = useRef(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncCooldownMs = 10000; // 10 seconds cooldown

  // Handle sync with robust error handling
  const handleSync = async (repoFullName: string, branch: string) => {
    try {
      if (!repoFullName || !branch) {
        console.error('useRepoSync - Cannot sync: missing repo or branch');
        setSyncError('No repository or branch selected');
        return;
      }
      
      // Prevent multiple rapid sync attempts with a cooldown
      const now = Date.now();
      if (now - lastSyncAttemptRef.current < syncCooldownMs) {
        console.log('useRepoSync - Sync attempted too quickly, debouncing...');
        setSyncError(`Please wait ${syncCooldownMs / 1000} seconds between sync attempts`);
        return;
      }
      
      // Don't allow if already syncing
      if (isSyncing) {
        console.log('useRepoSync - Already syncing, ignoring request');
        return;
      }
      
      // Reset error state
      setSyncError(null);
      lastSyncAttemptRef.current = now;
      setIsSyncing(true);
      
      // First delete all existing files
      console.log('useRepoSync - Deleting all existing files before syncing...');
      try {
        await deleteAllFiles();
      } catch (deleteError) {
        console.error('useRepoSync - Error deleting files:', deleteError);
        setSyncError('Failed to delete existing files');
        setIsSyncing(false);
        return;
      }
      
      // Then sync the new repository
      const [owner, repo] = repoFullName.split('/');
      console.log(`useRepoSync - Syncing repository ${owner}/${repo} (${branch})...`);
      
      // Perform the sync operation
      const result = await syncRepoToFileSystem(owner, repo, branch);
      
      // Check result
      if (result === true) {
        console.log('useRepoSync - Sync successful');
        return true;
      } else {
        console.error('useRepoSync - Sync failed or no files were created');
        setSyncError('Sync failed or no files were created');
        return false;
      }
    } catch (error: any) {
      console.error('useRepoSync - Error in sync process:', error);
      setSyncError(error.message || 'Unknown error during sync');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Clean up timeouts when hook unmounts
  const cleanup = () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
  };

  return {
    isSyncing,
    syncError,
    handleSync,
    cleanup
  };
};
