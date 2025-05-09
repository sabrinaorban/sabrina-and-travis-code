
import { useState, useRef, useCallback, useEffect } from 'react';
import { GitHubRepo, GitHubBranch, GitHubFile } from '@/types/github';
import { GithubApiService } from '@/services/github/githubApiService';
import { GithubRepositoryService } from '@/services/github/githubRepositoryService';
import { GithubSyncService } from '@/services/github/githubSyncService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGithubRepositories } from './useGithubRepositories';
import { useGithubBranches } from './useGithubBranches';
import { useGithubFiles } from './useGithubFiles';
import { useGithubSave } from './useGithubSave';
import { useGithubSync } from './useGithubSync';

export const useGithubOperations = (token: string | null) => {
  const [currentRepo, setCurrentRepo] = useState<GitHubRepo | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  
  // Add operation tracking to prevent multiple concurrent operations
  const isFetchingRef = useRef(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  console.log('useGithubOperations - Initialized with token:', token ? 'present' : 'missing');
  
  // Create API service with both token and userId if available
  const apiService = new GithubApiService({ 
    token,
    userId: user?.id 
  });
  
  const repositoryService = new GithubRepositoryService(apiService, toast);
  const syncService = new GithubSyncService(apiService, toast);

  // Initialize repository operations
  const { 
    repositories, 
    fetchRepositories,
    isLoading: isLoadingRepositories 
  } = useGithubRepositories(token, repositoryService, isFetchingRef);

  // Initialize branch operations  
  const {
    branches,
    fetchBranches,
    setBranches,
    isLoading: isLoadingBranches
  } = useGithubBranches(token, repositoryService, isFetchingRef);

  // Initialize file operations
  const {
    files,
    setFiles,
    fetchFiles,
    fetchFileContent,
    isLoading: isLoadingFiles
  } = useGithubFiles(token, repositoryService, isFetchingRef);

  // Initialize save operations
  const {
    saveFileToRepo,
    isLoading: isLoadingSave
  } = useGithubSave(token, repositoryService);

  // Initialize sync operations
  const {
    syncRepoToFileSystem,
    isLoading: isLoadingSync
  } = useGithubSync(token, syncService, isFetchingRef);
  
  // Combine loading states
  const isLoading = isLoadingRepositories || isLoadingBranches || 
                    isLoadingFiles || isLoadingSave || isLoadingSync;

  // Helper to reset state
  const reset = useCallback(() => {
    console.log('useGithubOperations - Resetting state');
    setCurrentRepo(null);
    setCurrentBranch(null);
    setBranches([]);
    setFiles([]);
    isFetchingRef.current = false;
    
    // Clear session storage
    sessionStorage.removeItem('github_current_repo');
    sessionStorage.removeItem('github_current_branch');
  }, [setBranches, setFiles]);

  // Add error handling for unhandled errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('useGithubOperations - Unhandled error:', event.error);
      // Reset the fetching state to prevent getting stuck
      isFetchingRef.current = false;
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  const selectRepository = useCallback(async (repo: GitHubRepo) => {
    try {
      console.log(`useGithubOperations - Selecting repository: ${repo.full_name}`);
      
      // Set the current repository first
      setCurrentRepo(repo);
      
      // Clear branches when selecting a new repo to prevent stale data
      setBranches([]);
      setCurrentBranch(null);
      setFiles([]);
      
      // Fetch branches (use a small timeout to ensure state updates first)
      const branchesFetched = await fetchBranches(repo.full_name);
      
      // If we have a default branch, select it automatically
      if (branchesFetched.length > 0) {
        const defaultBranch = branchesFetched.find(b => b.name === repo.default_branch) || branchesFetched[0];
        if (defaultBranch) {
          console.log(`useGithubOperations - Auto-selecting default branch: ${defaultBranch.name}`);
          // Allow state to update before selecting branch
          setTimeout(() => {
            setCurrentBranch(defaultBranch.name);
          }, 100);
        }
      }
    } catch (error) {
      console.error('useGithubOperations - Error selecting repository:', error);
      toast({
        title: "Error selecting repository",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [fetchBranches, setBranches, setFiles, toast]);

  const selectBranch = useCallback(async (branchName: string) => {
    try {
      console.log(`useGithubOperations - Selecting branch: ${branchName}`);
      
      // Set the current branch
      setCurrentBranch(branchName);
      
      // Clear files when selecting a new branch to prevent stale data
      setFiles([]);
      
      if (currentRepo) {
        // Fetch files for the selected branch
        await fetchFiles(currentRepo.full_name, branchName);
      }
    } catch (error) {
      console.error('useGithubOperations - Error selecting branch:', error);
      toast({
        title: "Error selecting branch",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [currentRepo, fetchFiles, setFiles, toast]);

  return {
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
    syncRepoToFileSystem,
    reset,
    // Expose these setters for direct state management when needed
    setCurrentRepo,
    setCurrentBranch
  };
};
