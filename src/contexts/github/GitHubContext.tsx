import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { FileEntry } from '@/types';
import { useFileSystem } from '../FileSystemContext';
import { useAuth } from '../AuthContext';
import { GithubTokenService } from '@/services/github/githubTokenService';
import { useGithubOperations } from '@/hooks/github/useGithubOperations';
import { useGitHubAuth, GitHubAuthResult } from './useGitHubAuth';
import { useGitHubMemory } from './useGitHubMemory';
import { useGitHubRepoSelection } from './useGitHubRepoSelection';
import { useGitHubSync } from './useGitHubSync';
import { GitHubContextType } from './githubContextTypes';

// Create GitHub context with null check
const GitHubContext = createContext<GitHubContextType | null>(null);

export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const fileSystemContext = useFileSystem();
  const { refreshFiles, createFile, createFolder } = fileSystemContext;
  const { user } = useAuth();
  
  console.log('GitHubProvider - Initializing with user:', user?.id);
  
  // Initialize GitHub auth
  const githubAuthHook = useGitHubAuth();
  const { authState, authenticate, logout } = githubAuthHook;
  
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
    reset
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
  const { syncRepoToFileSystem } = useGitHubSync(syncRepo, user?.id);

  // Create a memoized value for the loading state to prevent unnecessary re-renders
  const loadingState = useMemo(() => {
    return isLoading || isInitializing || isRestoringRepo();
  }, [isLoading, isInitializing, isRestoringRepo]);

  // Load saved GitHub token when user changes
  useEffect(() => {
    const loadSavedToken = async () => {
      if (user && user.id && !isAuthInitialized) {
        try {
          console.log('GitHubProvider - Loading saved token for user:', user.id);
          setIsInitializing(true);
          const tokenData = await GithubTokenService.loadToken(user.id);
          if (tokenData && tokenData.token) {
            console.log('GitHubProvider - Found saved GitHub token, restoring session');
            await authenticate(tokenData.token);
            setAuthInitialized(true);
          } else {
            console.log('GitHubProvider - No saved GitHub token found');
          }
        } catch (error) {
          console.error('GitHubProvider - Error loading GitHub token:', error);
        } finally {
          setIsInitializing(false);
        }
      } else if (!user) {
        console.log('GitHubProvider - No user, skipping token load');
        setIsInitializing(false);
      }
    };
    
    loadSavedToken();
  }, [user, authenticate, isAuthInitialized, setAuthInitialized]);

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

  // Store repository and branch selection in localStorage
  useEffect(() => {
    if (currentRepo && currentBranch) {
      console.log(`GitHubProvider - Saving repo info to localStorage: ${currentRepo.full_name} (${currentBranch})`);
      localStorage.setItem('githubRepoInfo', JSON.stringify({
        repoFullName: currentRepo.full_name,
        branchName: currentBranch
      }));
    }
  }, [currentRepo, currentBranch]);

  // Create a wrapper for syncRepoToFileSystem that includes refreshFiles
  const handleSyncRepoToFileSystem = async (
    owner: string,
    repo: string,
    branch: string
  ): Promise<boolean> => {
    return syncRepoToFileSystem(owner, repo, branch, createFile, createFolder, refreshFiles);
  };

  // Create a wrapper for saveFileToRepo to match the expected interface
  const handleSaveFileToRepo = async (
    filePath: string,
    content: string,
    commitMessage: string
  ): Promise<boolean> => {
    if (!currentRepo || !currentBranch) {
      console.error("Cannot save file: No repository or branch selected");
      return false;
    }
    return saveFileToRepo(currentRepo.full_name, filePath, content, commitMessage, currentBranch);
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<GitHubContextType>(() => {
    return {
      authState,
      authenticate,
      repositories,
      branches,
      availableBranches: branches, // Ensure we pass branches here
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
      syncRepoToFileSystem: handleSyncRepoToFileSystem,
      logout: handleLogout
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
    saveFileToRepo,
    handleSaveFileToRepo,
    handleSyncRepoToFileSystem,
    handleLogout
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
