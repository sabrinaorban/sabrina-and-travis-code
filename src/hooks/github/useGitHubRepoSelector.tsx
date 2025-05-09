
import { useEffect, useRef } from 'react';
import { useGitHub } from '@/contexts/github';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useToast } from '@/hooks/use-toast';
import { useRepoSync } from '@/hooks/github/useRepoSync';
import { useRepositorySelection } from '@/hooks/github/useRepositorySelection';
import { useSyncDialog } from '@/hooks/github/useSyncDialog';

export const useGitHubRepoSelector = () => {
  // Get contexts
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
  } = useGitHub();
  
  const { isLoading: fileSystemLoading, deleteAllFiles } = useFileSystem();
  const { toast } = useToast();
  
  // Flag to prevent multiple repository fetches
  const hasInitializedRef = useRef(false);

  // Use custom hooks for repository selection, sync dialog and sync operations
  const { 
    isFetchingBranches,
    selectingRepoRef,
    handleRepositoryChange: baseHandleRepositoryChange,
    handleBranchChange,
    cleanup: cleanupRepositorySelection
  } = useRepositorySelection(selectRepository, selectBranch);
  
  const {
    isSyncDialogOpen,
    setIsSyncDialogOpen,
    openSyncDialog,
    syncInProgress,
    startSync,
    finishSync
  } = useSyncDialog();
  
  const {
    isSyncing,
    syncError,
    handleSync: baseHandleSync,
    cleanup: cleanupRepoSync
  } = useRepoSync(syncRepoToFileSystem, deleteAllFiles);

  // Wrap handleRepositoryChange to provide repositories
  const handleRepositoryChange = (repoFullName: string) => {
    baseHandleRepositoryChange(repoFullName, repositories || []);
  };
  
  // Wrap handleSync to provide current repo and branch
  const handleSync = async () => {
    if (!currentRepo?.full_name || !currentBranch) {
      toast({
        title: "Cannot sync",
        description: "No repository or branch selected",
        variant: "destructive"
      });
      return false;
    }
    
    startSync();
    const result = await baseHandleSync(currentRepo.full_name, currentBranch);
    finishSync(result);
    
    // Close dialog on success after a short delay
    if (result) {
      setTimeout(() => {
        setIsSyncDialogOpen(false);
      }, 1000);
    }
    
    return result;
  };

  // Debug logging
  useEffect(() => {
    console.log('GitHubRepoSelector Hook - Current state:', {
      isAuthenticated: authState?.isAuthenticated,
      hasRepos: repositories?.length > 0,
      currentRepo: currentRepo?.full_name,
      currentBranch,
      isLoading,
      isSyncing,
    });
  }, [authState?.isAuthenticated, repositories, currentRepo, currentBranch, isLoading, isSyncing]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      cleanupRepositorySelection();
      cleanupRepoSync();
    };
  }, []);
  
  // Initialize repositories only once when authenticated
  useEffect(() => {
    if (authState?.isAuthenticated && !hasInitializedRef.current && !repositories?.length) {
      hasInitializedRef.current = true;
      console.log("useGitHubRepoSelector - Loading repositories on first authentication");
      fetchRepositories().catch(error => {
        console.error("useGitHubRepoSelector - Error fetching repositories:", error);
        hasInitializedRef.current = false; // Reset flag to allow retry
      });
    }
  }, [authState?.isAuthenticated, repositories, fetchRepositories]);

  return {
    authState,
    repositories,
    currentRepo,
    currentBranch,
    branches,
    isLoading,
    fileSystemLoading,
    isSyncing: isSyncing || contextIsSyncing || syncInProgress,
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
