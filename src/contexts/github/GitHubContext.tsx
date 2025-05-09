
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { FileEntry } from '@/types';
import { useFileSystem } from '../FileSystemContext';
import { useAuth } from '../AuthContext';
import { GithubTokenService } from '@/services/github/githubTokenService';
import { useGithubOperations } from '@/hooks/github/useGithubOperations';
import { useGitHubAuth } from './useGitHubAuth';
import { useGitHubMemory } from './useGitHubMemory';
import { useGitHubRepoSelection } from './useGitHubRepoSelection';
import { useGitHubSync } from './useGitHubSync';
import { GitHubContextType } from './githubContextTypes';
import { useToast } from '@/hooks/use-toast';

// Create GitHub context with null check
const GitHubContext = createContext<GitHubContextType | null>(null);

// Storage keys for session persistence
const STORAGE_KEY_REPO = 'github_current_repo';
const STORAGE_KEY_BRANCH = 'github_current_branch';

export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncState, setLastSyncState] = useState<{ isSuccessful: boolean; timestamp: number } | null>(null);
  
  // Create a ref to track if a sync is already in progress
  const syncInProgressRef = useRef<boolean>(false);
  
  const fileSystemContext = useFileSystem();
  const { refreshFiles, createFile, createFolder } = fileSystemContext;
  const { user } = useAuth();
  const { toast } = useToast();
  
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
    setCurrentRepo,  // Make sure this is exposed from useGithubOperations
    setCurrentBranch // Make sure this is exposed from useGithubOperations
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

  // Enhanced persistence: Store repository and branch selection in sessionStorage
  // This is more reliable for session persistence than localStorage
  useEffect(() => {
    if (currentRepo && currentBranch) {
      console.log(`GitHubProvider - Saving repo info to storage: ${currentRepo.full_name} (${currentBranch})`);
      
      // Store in localStorage for long-term persistence
      localStorage.setItem('githubRepoInfo', JSON.stringify({
        repoFullName: currentRepo.full_name,
        branchName: currentBranch
      }));
      
      // Store in sessionStorage for current session persistence
      sessionStorage.setItem(STORAGE_KEY_REPO, JSON.stringify(currentRepo));
      sessionStorage.setItem(STORAGE_KEY_BRANCH, currentBranch);
    }
  }, [currentRepo, currentBranch]);

  // Restore repository and branch from sessionStorage on page refresh
  useEffect(() => {
    // Only attempt restoration when authenticated and repos are loaded
    if (authState.isAuthenticated && repositories.length > 0 && !currentRepo && !isLoading) {
      try {
        // Try to restore from sessionStorage first
        const storedRepoJSON = sessionStorage.getItem(STORAGE_KEY_REPO);
        const storedBranch = sessionStorage.getItem(STORAGE_KEY_BRANCH);
        
        if (storedRepoJSON && storedBranch) {
          const storedRepo = JSON.parse(storedRepoJSON);
          console.log(`GitHubProvider - Restoring repo from session: ${storedRepo.full_name} (${storedBranch})`);
          
          // Find matching repo in loaded repositories
          const matchingRepo = repositories.find(r => r.id === storedRepo.id);
          
          if (matchingRepo) {
            // Set current repo and branch directly
            setCurrentRepo(matchingRepo);
            setCurrentBranch(storedBranch);
            
            // Fetch branches for this repo to ensure they're available
            fetchBranches(matchingRepo.full_name).catch(console.error);
          } else {
            console.log('GitHubProvider - Could not find matching repo in loaded repositories');
          }
        }
      } catch (error) {
        console.error('GitHubProvider - Error restoring repo from session storage:', error);
      }
    }
  }, [authState.isAuthenticated, repositories, currentRepo, isLoading, setCurrentRepo, setCurrentBranch]);

  // Get last sync state
  const getLastSyncState = () => {
    return lastSyncState;
  };

  // Reset sync state
  const resetSyncState = () => {
    setLastSyncState(null);
  };

  // Create a wrapper for syncRepoToFileSystem that includes sync state tracking
  const handleSyncRepoToFileSystem = async (
    owner: string,
    repo: string,
    branch: string
  ): Promise<boolean> => {
    // If a sync is already in progress, prevent starting another
    if (syncInProgressRef.current) {
      console.log('GitHubProvider - Sync already in progress, aborting new sync request');
      toast({
        title: "Sync in progress",
        description: "Please wait for the current sync operation to complete",
      });
      return false;
    }

    try {
      // Set sync flags
      syncInProgressRef.current = true;
      setIsSyncing(true);
      
      console.log(`GitHubProvider - Starting sync of ${owner}/${repo} (${branch})`);
      
      // Execute the sync operation
      const result = await syncRepoToFileSystem(owner, repo, branch, createFile, createFolder, refreshFiles);
      
      // Update sync state
      setLastSyncState({
        isSuccessful: result,
        timestamp: Date.now()
      });
      
      // Give user feedback
      if (result) {
        toast({
          title: "Sync completed",
          description: `Repository ${repo} has been successfully imported`,
        });
      } else {
        toast({
          title: "Sync failed",
          description: `Failed to import repository ${repo}`,
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error) {
      console.error("GitHubProvider - Error in syncRepoToFileSystem:", error);
      setLastSyncState({
        isSuccessful: false,
        timestamp: Date.now()
      });
      
      toast({
        title: "Sync error",
        description: `An unexpected error occurred while importing the repository`,
        variant: "destructive",
      });
      
      return false;
    } finally {
      // Reset sync flags with a small delay to prevent immediate re-triggering
      setTimeout(() => {
        syncInProgressRef.current = false;
        setIsSyncing(false);
      }, 1000);
    }
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
      syncRepoToFileSystem: handleSyncRepoToFileSystem,
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
    lastSyncState,
    isSyncing
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
