
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGitHub } from '@/contexts/github';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { GitHubRepo } from '@/types/github';

export const useGitHubRepoSelector = () => {
  const { 
    authState, 
    repositories, 
    currentRepo, 
    currentBranch, 
    branches, 
    isLoading, 
    fetchRepositories, 
    selectRepository, 
    selectBranch, 
    syncRepoToFileSystem,
    isSyncing: contextIsSyncing,
    getLastSyncState 
  } = useGitHub();
  
  const { refreshFiles, isLoading: fileSystemLoading, deleteAllFiles } = useFileSystem();
  
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  
  // Track the last sync attempt time to prevent rapid clicking
  const lastSyncAttemptRef = useRef(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncCooldownMs = 10000; // 10 seconds cooldown
  
  // Track repo selection to prevent race conditions
  const selectingRepoRef = useRef(false);
  const branchSelectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize internal isSyncing state with context state
  useEffect(() => {
    setIsSyncing(contextIsSyncing);
  }, [contextIsSyncing]);
  
  // Debug logs
  useEffect(() => {
    console.log('GitHubRepoSelector - Auth state:', authState?.isAuthenticated);
    console.log('GitHubRepoSelector - Repos count:', repositories?.length);
    console.log('GitHubRepoSelector - Current repo:', currentRepo?.full_name);
    console.log('GitHubRepoSelector - Current branch:', currentBranch);
    console.log('GitHubRepoSelector - Branches count:', branches?.length);
    console.log('GitHubRepoSelector - Loading states:', { isLoading, fileSystemLoading, isSyncing, isFetchingBranches });
  }, [authState, repositories, currentRepo, currentBranch, branches, isLoading, fileSystemLoading, isSyncing, isFetchingBranches]);
  
  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (branchSelectionTimeoutRef.current) {
        clearTimeout(branchSelectionTimeoutRef.current);
      }
    };
  }, []);

  // Handle repository selection with debounce for UI feedback
  const handleRepositoryChange = async (repoFullName: string) => {
    try {
      // Prevent multiple concurrent repo selections
      if (selectingRepoRef.current) {
        console.log('GitHubRepoSelector - Repository selection in progress, debouncing...');
        return;
      }
      
      // Reset sync error when changing repositories
      setSyncError(null);
      setIsFetchingBranches(true);
      selectingRepoRef.current = true;
      
      console.log('GitHubRepoSelector - Repository selected:', repoFullName);
      const repo = repositories?.find(r => r.full_name === repoFullName);
      
      if (repo) {
        await selectRepository(repo);
        
        // Add a small delay to allow branches to load
        if (branchSelectionTimeoutRef.current) {
          clearTimeout(branchSelectionTimeoutRef.current);
        }
        
        branchSelectionTimeoutRef.current = setTimeout(() => {
          setIsFetchingBranches(false);
          selectingRepoRef.current = false;
        }, 1500);
      } else {
        setIsFetchingBranches(false);
        selectingRepoRef.current = false;
      }
    } catch (error) {
      console.error('GitHubRepoSelector - Error in handleRepositoryChange:', error);
      setIsFetchingBranches(false);
      selectingRepoRef.current = false;
    }
  };

  // Handle branch selection with error handling
  const handleBranchChange = async (branch: string) => {
    try {
      // Reset sync error when changing branches
      setSyncError(null);
      
      console.log('GitHubRepoSelector - Branch selected:', branch);
      await selectBranch(branch);
    } catch (error) {
      console.error('GitHubRepoSelector - Error in handleBranchChange:', error);
    }
  };

  // Handle sync with robust error handling
  const handleSync = async () => {
    try {
      if (!currentRepo || !currentBranch) {
        console.error('GitHubRepoSelector - Cannot sync: missing repo or branch');
        setSyncError('No repository or branch selected');
        return;
      }
      
      // Prevent multiple rapid sync attempts with a cooldown
      const now = Date.now();
      if (now - lastSyncAttemptRef.current < syncCooldownMs) {
        console.log('GitHubRepoSelector - Sync attempted too quickly, debouncing...');
        setSyncError(`Please wait ${syncCooldownMs / 1000} seconds between sync attempts`);
        return;
      }
      
      // Don't allow if already syncing
      if (isSyncing) {
        console.log('GitHubRepoSelector - Already syncing, ignoring request');
        return;
      }
      
      // Reset error state
      setSyncError(null);
      lastSyncAttemptRef.current = now;
      
      // First delete all existing files
      console.log('GitHubRepoSelector - Deleting all existing files before syncing...');
      try {
        await deleteAllFiles();
      } catch (deleteError) {
        console.error('GitHubRepoSelector - Error deleting files:', deleteError);
        setSyncError('Failed to delete existing files');
        return;
      }
      
      // Then sync the new repository
      const [owner, repo] = currentRepo.full_name.split('/');
      console.log(`GitHubRepoSelector - Syncing repository ${owner}/${repo} (${currentBranch})...`);
      
      // The syncRepoToFileSystem function now takes care of setting the isSyncing state
      const result = await syncRepoToFileSystem(owner, repo, currentBranch);
      
      // Check result
      if (result === true) {
        console.log('GitHubRepoSelector - Sync successful');
        // Close dialog on success after a short delay
        setTimeout(() => {
          setIsSyncDialogOpen(false);
        }, 1000);
      } else {
        console.error('GitHubRepoSelector - Sync failed or no files were created');
        setSyncError('Sync failed or no files were created');
      }
    } catch (error: any) {
      console.error('GitHubRepoSelector - Error in sync process:', error);
      setSyncError(error.message || 'Unknown error during sync');
    }
  };

  return {
    authState,
    repositories,
    currentRepo,
    currentBranch,
    branches,
    isLoading,
    fileSystemLoading,
    isSyncing,
    isFetchingBranches,
    isSyncDialogOpen,
    syncError,
    selectingRepoRef,
    handleRepositoryChange,
    handleBranchChange,
    handleSync,
    fetchRepositories,
    setIsSyncDialogOpen,
  };
};
