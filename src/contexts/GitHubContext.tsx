
import React, { createContext, useContext, useState, useEffect } from 'react';
import { FileEntry } from '../types';
import { GitHubContextType } from '../types/github';
import { useFileSystem } from './FileSystemContext';
import { useGithubAuth } from '@/hooks/useGithubAuth';
import { useGithubRepos } from '@/hooks/useGithubRepos';
import { useAuth } from './AuthContext';
import { GithubTokenService } from '@/services/github/githubTokenService';

// GitHub context creation
const GitHubContext = createContext<GitHubContextType | null>(null);

export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const { refreshFiles, createFile, createFolder } = useFileSystem();
  const { user } = useAuth();
  
  // Use our custom hooks for GitHub functionality
  const { authState, authenticate, logout } = useGithubAuth();
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
  } = useGithubRepos(authState.token);

  // Load saved GitHub token when user changes
  useEffect(() => {
    const loadSavedToken = async () => {
      if (user && user.id) {
        try {
          const tokenData = await GithubTokenService.loadToken(user.id);
          if (tokenData && tokenData.token) {
            console.log('Found saved GitHub token, restoring session');
            authenticate(tokenData.token);
          }
        } catch (error) {
          console.error('Error loading GitHub token:', error);
        }
      }
    };
    
    loadSavedToken();
  }, [user, authenticate]);

  // Save token when authentication state changes
  useEffect(() => {
    const saveToken = async () => {
      if (user && user.id && authState.isAuthenticated && authState.token) {
        try {
          await GithubTokenService.saveToken(user.id, authState.token, authState.username || '');
          console.log('GitHub token saved to database');
        } catch (error) {
          console.error('Error saving GitHub token:', error);
        }
      }
    };
    
    if (authState.isAuthenticated && authState.token) {
      saveToken();
    }
  }, [authState.isAuthenticated, authState.token, authState.username, user]);

  // Sync repository to file system
  const syncRepoToFileSystem = async (owner: string, repo: string, branch: string) => {
    await syncRepo(owner, repo, branch, createFile, createFolder);
    await refreshFiles();
  };

  // Handle logout with reset
  const handleLogout = async () => {
    if (user && user.id) {
      try {
        await GithubTokenService.deleteToken(user.id);
      } catch (error) {
        console.error('Error deleting GitHub token:', error);
      }
    }
    logout();
    reset();
  };

  return (
    <GitHubContext.Provider value={{
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
      fetchFileContent,
      isLoading,
      saveFileToRepo,
      syncRepoToFileSystem,
      logout: handleLogout
    }}>
      {children}
    </GitHubContext.Provider>
  );
};

export const useGitHub = () => {
  const context = useContext(GitHubContext);
  if (!context) {
    throw new Error('useGitHub must be used within a GitHubProvider');
  }
  return context;
};
