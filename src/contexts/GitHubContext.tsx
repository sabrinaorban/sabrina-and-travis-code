
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { FileEntry } from '../types';
import { GitHubContextType } from '../types/github';
import { useFileSystem } from './FileSystemContext';
import { useGithubAuth } from '@/hooks/useGithubAuth';
import { useGithubRepos } from '@/hooks/useGithubRepos';
import { useAuth } from './AuthContext';
import { GithubTokenService } from '@/services/github/githubTokenService';
import { MemoryService } from '@/services/MemoryService';
import { useToast } from '@/hooks/use-toast';

// GitHub context creation
const GitHubContext = createContext<GitHubContextType | null>(null);

export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const fileSystemContext = useFileSystem();
  const { refreshFiles, createFile, createFolder } = fileSystemContext;
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Track authentication state to prevent duplicate toasts
  const tokenSavedRef = useRef(false);
  const authInitializedRef = useRef(false);
  const lastAuthStateRef = useRef({ 
    isAuthenticated: false, 
    token: null as string | null,
    username: null as string | null
  });
  
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

  // Load GitHub contextual memory
  const loadGitHubMemory = useCallback(async () => {
    if (!user?.id || !authState.isAuthenticated) return;
    
    try {
      // Fetch recent repositories
      const recentRepos = await MemoryService.retrieveMemory(user.id, 'github_recent_repositories');
      
      // Fetch recent file interactions
      const recentFiles = await MemoryService.retrieveMemory(user.id, 'github_recent_files');
      
      // Fetch recent commit history
      const commitHistory = await MemoryService.retrieveMemory(user.id, 'github_commit_history');
      
      console.log('Loaded GitHub memory context:', { 
        recentRepositories: recentRepos,
        recentFiles: recentFiles,
        commitHistory: commitHistory?.length || 0
      });
      
      // Store this context in memory for the AI
      await MemoryService.storeMemory(user.id, 'github_context', {
        recentRepositories: recentRepos,
        recentFiles: recentFiles,
        commitHistory: commitHistory,
        lastAccessed: new Date().toISOString(),
        username: authState.username
      });
      
    } catch (error) {
      console.error('Error loading GitHub memory:', error);
    }
  }, [user, authState.isAuthenticated, authState.username]);

  // Load saved GitHub token when user changes
  useEffect(() => {
    const loadSavedToken = async () => {
      if (user && user.id && !authInitializedRef.current) {
        try {
          setIsInitializing(true);
          const tokenData = await GithubTokenService.loadToken(user.id);
          if (tokenData && tokenData.token) {
            console.log('Found saved GitHub token, restoring session');
            await authenticate(tokenData.token);
            authInitializedRef.current = true;
          }
        } catch (error) {
          console.error('Error loading GitHub token:', error);
        } finally {
          setIsInitializing(false);
        }
      } else if (!user) {
        setIsInitializing(false);
      }
    };
    
    loadSavedToken();
  }, [user, authenticate]);

  // Save token when authentication state changes - with protection against multiple saves
  useEffect(() => {
    const saveToken = async () => {
      if (user && user.id && authState.isAuthenticated && authState.token && !tokenSavedRef.current) {
        try {
          await GithubTokenService.saveToken(user.id, authState.token, authState.username || '');
          console.log('GitHub token saved to database');
          tokenSavedRef.current = true; // Mark as saved to prevent repeated saves
          
          // Only show toast if authentication state changed
          if (!lastAuthStateRef.current.isAuthenticated || 
              lastAuthStateRef.current.username !== authState.username) {
            toast({
              title: "Connected to GitHub",
              description: `Successfully connected as ${authState.username}`,
            });
          }
        } catch (error) {
          console.error('Error saving GitHub token:', error);
        }
      }
      
      // Update last auth state reference
      lastAuthStateRef.current = {
        isAuthenticated: authState.isAuthenticated,
        token: authState.token,
        username: authState.username
      };
    };
    
    if (authState.isAuthenticated && authState.token) {
      saveToken();
      loadGitHubMemory();
    } else if (!authState.isAuthenticated) {
      // Reset the flags when logged out
      tokenSavedRef.current = false;
      authInitializedRef.current = false;
    }
  }, [authState.isAuthenticated, authState.token, authState.username, user, toast, loadGitHubMemory]);

  // Sync repository to file system
  const syncRepoToFileSystem = async (owner: string, repo: string, branch: string): Promise<boolean> => {
    const result = await syncRepo(owner, repo, branch, createFile, createFolder);
    await refreshFiles();
    
    // Store sync operation in memory
    if (user?.id) {
      await MemoryService.storeMemory(user.id, 'github_last_sync', {
        owner,
        repo,
        branch,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  };

  // Handle logout with reset
  const handleLogout = async () => {
    if (user && user.id) {
      try {
        await GithubTokenService.deleteToken(user.id);
        tokenSavedRef.current = false; // Reset the token saved flag
        authInitializedRef.current = false; // Reset the auth initialized flag
        
        // Clear GitHub-related memory
        await MemoryService.storeMemory(user.id, 'github_context', null);
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
      isLoading: isLoading || isInitializing,
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
