
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { FileEntry } from '../types';
import { GitHubContextType, GitHubAuthState } from '../types/github';
import { useFileSystem } from './FileSystemContext';
import { useGithubAuth } from '@/hooks/useGithubAuth';
import { useGithubRepos } from '@/hooks/useGithubRepos';
import { useAuth } from './AuthContext';
import { GithubTokenService } from '@/services/github/githubTokenService';
import { MemoryService } from '@/services/MemoryService';
import { useToast } from '@/hooks/use-toast';

// Create GitHub context with null check
const GitHubContext = createContext<GitHubContextType | null>(null);

// Default authentication state
const defaultAuthState: GitHubAuthState = {
  isAuthenticated: false,
  token: null,
  username: null,
  loading: true,
  error: null
};

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
  
  console.log('GitHubProvider - Initializing with user:', user?.id);
  
  // Use our custom hooks for GitHub functionality
  const { authState, authenticate, logout } = useGithubAuth();
  
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
  } = useGithubRepos(authState.token);

  // Load GitHub contextual memory
  const loadGitHubMemory = useCallback(async () => {
    if (!user?.id || !authState.isAuthenticated) {
      console.log('GitHubProvider - Cannot load memory: missing user or not authenticated');
      return;
    }
    
    try {
      console.log('GitHubProvider - Loading GitHub memory for user:', user.id);
      
      // Fetch recent repositories
      const recentRepos = await MemoryService.retrieveMemory(user.id, 'github_recent_repositories');
      
      // Fetch recent file interactions
      const recentFiles = await MemoryService.retrieveMemory(user.id, 'github_recent_files');
      
      // Fetch recent commit history
      const commitHistory = await MemoryService.retrieveMemory(user.id, 'github_commit_history');
      
      console.log('GitHubProvider - Loaded GitHub memory context:', { 
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
      console.error('GitHubProvider - Error loading GitHub memory:', error);
    }
  }, [user, authState.isAuthenticated, authState.username]);

  // Load saved GitHub token when user changes
  useEffect(() => {
    const loadSavedToken = async () => {
      if (user && user.id && !authInitializedRef.current) {
        try {
          console.log('GitHubProvider - Loading saved token for user:', user.id);
          setIsInitializing(true);
          const tokenData = await GithubTokenService.loadToken(user.id);
          if (tokenData && tokenData.token) {
            console.log('GitHubProvider - Found saved GitHub token, restoring session');
            await authenticate(tokenData.token);
            authInitializedRef.current = true;
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
  }, [user, authenticate]);

  // Save token when authentication state changes - with protection against multiple saves
  useEffect(() => {
    const saveToken = async () => {
      if (!user || !user.id) {
        console.log('GitHubProvider - No user, skipping token save');
        return;
      }
      
      if (!authState.isAuthenticated || !authState.token) {
        console.log('GitHubProvider - Not authenticated or no token, skipping save');
        return;
      }
      
      if (tokenSavedRef.current) {
        console.log('GitHubProvider - Token already saved, skipping duplicate save');
        return;
      }
      
      try {
        console.log('GitHubProvider - Saving token for user:', user.id);
        await GithubTokenService.saveToken(user.id, authState.token, authState.username || '');
        console.log('GitHubProvider - GitHub token saved to database');
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
        console.error('GitHubProvider - Error saving GitHub token:', error);
      }
      
      // Update last auth state reference
      lastAuthStateRef.current = {
        isAuthenticated: authState.isAuthenticated,
        token: authState.token,
        username: authState.username
      };
    };
    
    saveToken();
    
    // Load GitHub memory and restore repo selection
    if (authState.isAuthenticated && authState.token) {
      console.log('GitHubProvider - Authenticated, loading memory and restoring repo selection');
      loadGitHubMemory();
      
      // If we're authenticated, restore repository info from local storage
      const storedRepoInfo = localStorage.getItem('githubRepoInfo');
      if (storedRepoInfo) {
        try {
          console.log('GitHubProvider - Found stored repo info:', storedRepoInfo);
          const { repoFullName, branchName } = JSON.parse(storedRepoInfo);
          
          // Fetch repositories if needed
          const initializeRepoSelection = async () => {
            if (repositories.length === 0) {
              console.log('GitHubProvider - Fetching repositories before restoring selection');
              await fetchRepositories();
            }
            
            // Find the repository in the list and select it
            if (repoFullName && repositories.length > 0) {
              const repo = repositories.find(r => r.full_name === repoFullName);
              if (repo) {
                console.log('GitHubProvider - Restoring repo selection:', repo.full_name);
                await selectRepository(repo);
                
                if (branchName) {
                  console.log('GitHubProvider - Restoring branch selection:', branchName);
                  await selectBranch(branchName);
                }
              } else {
                console.log('GitHubProvider - Stored repo not found in the list:', repoFullName);
              }
            }
          };
          
          initializeRepoSelection();
        } catch (error) {
          console.error('GitHubProvider - Error restoring repo info:', error);
        }
      } else {
        console.log('GitHubProvider - No stored repo info found');
      }
    } else if (!authState.isAuthenticated) {
      // Reset the flags when logged out
      console.log('GitHubProvider - Not authenticated, resetting flags');
      tokenSavedRef.current = false;
      authInitializedRef.current = false;
      localStorage.removeItem('githubRepoInfo');
    }
  }, [authState.isAuthenticated, authState.token, authState.username, user, toast, loadGitHubMemory, repositories, fetchRepositories, selectRepository, selectBranch]);

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

  // Sync repository to file system - updated to return boolean and not trigger automatic refreshes
  const syncRepoToFileSystem = async (owner: string, repo: string, branch: string): Promise<boolean> => {
    try {
      console.log(`GitHubProvider - Syncing repo ${owner}/${repo} (${branch}) to file system`);
      const result = await syncRepo(owner, repo, branch, createFile, createFolder);
      
      // Only manually refresh once
      if (result) {
        // Single manual refresh after sync
        console.log('GitHubProvider - Sync successful, refreshing files');
        await refreshFiles();
      } else {
        console.log('GitHubProvider - Sync returned false, not refreshing files');
      }
      
      // Store sync operation in memory
      if (user?.id) {
        await MemoryService.storeMemory(user.id, 'github_last_sync', {
          owner,
          repo,
          branch,
          timestamp: new Date().toISOString(),
          success: result
        });
      }
      
      return result;
    } catch (error) {
      console.error("GitHubProvider - Error in syncRepoToFileSystem:", error);
      return false;
    }
  };

  // Handle logout with reset
  const handleLogout = async () => {
    if (user && user.id) {
      try {
        console.log('GitHubProvider - Logging out user:', user.id);
        await GithubTokenService.deleteToken(user.id);
        tokenSavedRef.current = false; // Reset the token saved flag
        authInitializedRef.current = false; // Reset the auth initialized flag
        localStorage.removeItem('githubRepoInfo');
        
        // Clear GitHub-related memory
        await MemoryService.storeMemory(user.id, 'github_context', null);
      } catch (error) {
        console.error('GitHubProvider - Error deleting GitHub token:', error);
      }
    }
    logout();
    reset();
  };

  const contextValue: GitHubContextType = {
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
  };

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
