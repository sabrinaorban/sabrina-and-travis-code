
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { FileEntry } from '@/types';
import { useFileSystem } from '../FileSystemContext';
import { useAuth } from '../AuthContext';
import { useGithubOperations } from '@/hooks/github/useGithubOperations';
import { useGitHubAuth } from './useGitHubAuth';
import { useGitHubMemory } from './useGitHubMemory';
import { useGitHubRepoSelection } from './useGitHubRepoSelection';
import { GitHubContextType } from './githubContextTypes';
import { useGitHubInit } from './hooks/useGitHubInit';
import { useGitHubPersistence } from './hooks/useGitHubPersistence';
import { useGitHubContextSync } from './hooks/useGitHubSync';
import { useGitHubFileOperations } from './hooks/useGitHubFileOperations';

// Create GitHub context with null check
const GitHubContext = createContext<GitHubContextType | null>(null);

export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  
  const fileSystemContext = useFileSystem();
  const { refreshFiles, createFile, createFolder } = fileSystemContext;
  const { user } = useAuth();
  
  console.log('GitHubProvider - Initializing with user:', user?.id);
  
  // Initialize GitHub auth
  const { authState, authenticate, logout } = useGitHubAuth();
  
  useEffect(() => {
    console.log('GitHubProvider - Auth state update:', authState);
  }, [authState]);
  
  const { 
    repositories,
    branches,
    currentRepo,
    currentBranch,
    files,
    isLoading,
    fetchRepositories,
    selectRepository,
    selectBranch,
    fetchFileContent,
    saveFileToRepo,
    syncRepoToFileSystem: syncRepo,
    reset,
    setCurrentRepo,
    setCurrentBranch
  } = useGithubOperations(authState.token);

  // Debug logs for current state
  useEffect(() => {
    console.log('GitHubProvider - Current repo state:', {
      hasRepo: !!currentRepo,
      repoName: currentRepo?.full_name,
      branch: currentBranch,
      branchCount: branches.length,
    });
  }, [currentRepo, currentBranch, branches]);

  // Use custom hooks for GitHub functionality
  const { loadGitHubMemory } = useGitHubMemory();
  const githubAuthUtils = useGitHubAuth(user, authState, logout);
  const { handleLogout, isAuthInitialized, setAuthInitialized } = githubAuthUtils;
  const { isRestoringRepo } = useGitHubRepoSelection(
    authState, 
    fetchRepositories, 
    selectRepository, 
    selectBranch
  );
  
  // Use our new hooks
  const { isInitializing } = useGitHubInit(user, authenticate, isAuthInitialized, setAuthInitialized);
  const { isSyncing, getLastSyncState, resetSyncState, handleSyncRepoToFileSystem } = useGitHubContextSync(syncRepo, user?.id);
  const { handleSaveFileToRepo } = useGitHubFileOperations(saveFileToRepo, currentRepo, currentBranch);
  
  // Use GitHub persistence to restore state after refresh
  useGitHubPersistence(
    currentRepo,
    currentBranch,
    repositories,
    authState.isAuthenticated,
    isLoading,
    setCurrentRepo,
    setCurrentBranch,
    selectRepository
  );

  // Create a memoized value for the loading state to prevent unnecessary re-renders
  const loadingState = useMemo(() => {
    return isLoading || isInitializing || isRestoringRepo();
  }, [isLoading, isInitializing, isRestoringRepo]);

  // Load GitHub memory and handle auth changes
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      console.log('GitHubProvider - Authenticated, loading memory');
      loadGitHubMemory(user?.id, authState);
    } else if (!authState.isAuthenticated) {
      console.log('GitHubProvider - Not authenticated, resetting state');
      localStorage.removeItem('githubRepoInfo');
    }
  }, [authState.isAuthenticated, authState.token, authState, user, loadGitHubMemory]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<GitHubContextType>(() => {
    return {
      authState,
      authenticate,
      repositories,
      branches,
      availableBranches: branches,
      currentRepo,
      currentBranch,
      files,
      selectedFile,
      setSelectedFile,
      selectRepository,
      selectBranch,
      fetchRepositories,
      fetchFileContent: async (filePath: string): Promise<string | null> => {
        if (!currentRepo || !currentBranch) {
          console.error("Cannot fetch file content: No repository or branch selected");
          return null;
        }
        return fetchFileContent(currentRepo.full_name, filePath, currentBranch);
      },
      isLoading: loadingState,
      saveFileToRepo: handleSaveFileToRepo,
      syncRepoToFileSystem: (owner: string, repo: string, branch: string) => 
        handleSyncRepoToFileSystem(owner, repo, branch, createFile, createFolder, refreshFiles),
      logout: handleLogout,
      getLastSyncState,
      resetSyncState,
      isSyncing
    };
  }, [
    authState,
    authenticate,
    repositories,
    branches,
    currentRepo,
    currentBranch,
    files,
    selectedFile,
    selectRepository,
    selectBranch,
    fetchRepositories,
    fetchFileContent,
    loadingState,
    handleSaveFileToRepo,
    handleSyncRepoToFileSystem,
    handleLogout,
    getLastSyncState,
    resetSyncState,
    isSyncing,
    createFile,
    createFolder,
    refreshFiles
  ]);

  return (
    <GitHubContext.Provider value={contextValue}>
      {children}
    </GitHubContext.Provider>
  );
};

export const useGitHub = () => {
  const context = useContext(GitHubContext);
  if (!context) {
    console.error('useGitHub must be used within a GitHubProvider');
    throw new Error('useGitHub must be used within a GitHubProvider');
  }
  return context;
};
