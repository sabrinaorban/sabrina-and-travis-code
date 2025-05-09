import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { GitHubRepo, GitHubBranch, GitHubFile } from '@/types/github';
import { GithubApiService } from '@/services/github/githubApiService';
import { GithubRepositoryService } from '@/services/github/githubRepositoryService';
import { GithubSyncService } from '@/services/github/githubSyncService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useGithubRepos = (token: string | null) => {
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [currentRepo, setCurrentRepo] = useState<GitHubRepo | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Add operation tracking to prevent multiple concurrent operations
  const isFetchingRef = useRef(false);
  const lastOperationTimeRef = useRef(0);
  const COOLDOWN_MS = 2000; // 2 second cooldown between operations
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  console.log('useGithubRepos - Initialized with token:', token ? 'present' : 'missing');
  
  // Create API service with both token and userId if available
  const apiService = useMemo(() => new GithubApiService({ 
    token,
    userId: user?.id 
  }), [token, user?.id]);
  
  const repositoryService = useMemo(() => new GithubRepositoryService(apiService, toast), [apiService, toast]);
  const syncService = useMemo(() => new GithubSyncService(apiService, toast), [apiService, toast]);

  // Helper to check if we should throttle operations
  const shouldThrottle = useCallback(() => {
    const now = Date.now();
    return now - lastOperationTimeRef.current < COOLDOWN_MS;
  }, [COOLDOWN_MS]);

  // Define all functions before using them to avoid "used before declaration" error
  const fetchFiles = useCallback(async (repoFullName: string, branchName: string) => {
    if (!token) {
      console.log('useGithubRepos - Cannot fetch files: no token');
      return [];
    }
    
    // Prevent concurrent operations
    if (isFetchingRef.current) {
      console.log('useGithubRepos - Already fetching files, aborting');
      return files;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubRepos - Operation throttled, please wait');
      return files;
    }
    
    console.log(`useGithubRepos - Fetching files for ${repoFullName} (${branchName})`);
    setIsLoading(true);
    isFetchingRef.current = true;
    lastOperationTimeRef.current = Date.now();
    
    try {
      const filesList = await repositoryService.fetchFiles(repoFullName, branchName);
      console.log(`useGithubRepos - Fetched ${filesList.length} files`);
      setFiles(filesList);
      return filesList;
    } catch (error) {
      console.error('useGithubRepos - Error fetching files:', error);
      toast({
        title: "Failed to load files",
        description: "Please check branch access and try again",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [token, files, repositoryService, toast, shouldThrottle]);

  const fetchRepositories = useCallback(async () => {
    if (!token) {
      console.log('useGithubRepos - Cannot fetch repos: no token');
      return [];
    }
    
    // Prevent concurrent operations
    if (isFetchingRef.current) {
      console.log('useGithubRepos - Already fetching repositories, aborting');
      return repositories;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubRepos - Operation throttled, please wait');
      return repositories;
    }
    
    console.log('useGithubRepos - Fetching repositories');
    setIsLoading(true);
    isFetchingRef.current = true;
    lastOperationTimeRef.current = Date.now();
    
    try {
      const repos = await repositoryService.fetchRepositories();
      console.log(`useGithubRepos - Fetched ${repos.length} repositories`);
      setRepositories(repos);
      return repos;
    } catch (error) {
      console.error('useGithubRepos - Error fetching repositories:', error);
      toast({
        title: "Failed to load repositories",
        description: "Please check your GitHub connection and try again",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [token, repositories, repositoryService, toast, shouldThrottle]);

  const fetchBranches = useCallback(async (repoFullName: string) => {
    if (!token) {
      console.log('useGithubRepos - Cannot fetch branches: no token');
      return [];
    }
    
    // Prevent concurrent operations
    if (isFetchingRef.current) {
      console.log('useGithubRepos - Already fetching branches, aborting');
      return branches;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubRepos - Operation throttled, please wait');
      return branches;
    }
    
    console.log(`useGithubRepos - Fetching branches for ${repoFullName}`);
    setIsLoading(true);
    isFetchingRef.current = true;
    lastOperationTimeRef.current = Date.now();
    
    try {
      const branchList = await repositoryService.fetchBranches(repoFullName);
      console.log(`useGithubRepos - Fetched ${branchList.length} branches`);
      setBranches(branchList);
      return branchList;
    } catch (error) {
      console.error('useGithubRepos - Error fetching branches:', error);
      toast({
        title: "Failed to load branches",
        description: "Please check repository access and try again",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [token, branches, repositoryService, toast, shouldThrottle]);

  const selectRepository = useCallback(async (repo: GitHubRepo) => {
    try {
      console.log(`useGithubRepos - Selecting repository: ${repo.full_name}`);
      
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
          console.log(`useGithubRepos - Auto-selecting default branch: ${defaultBranch.name}`);
          // Allow state to update before selecting branch
          setTimeout(() => {
            setCurrentBranch(defaultBranch.name);
          }, 100);
        }
      }
    } catch (error) {
      console.error('useGithubRepos - Error selecting repository:', error);
      toast({
        title: "Error selecting repository",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [fetchBranches, toast]);

  const selectBranch = useCallback(async (branchName: string) => {
    try {
      console.log(`useGithubRepos - Selecting branch: ${branchName}`);
      
      // Set the current branch
      setCurrentBranch(branchName);
      
      // Clear files when selecting a new branch to prevent stale data
      setFiles([]);
      
      if (currentRepo) {
        // Fetch files for the selected branch
        await fetchFiles(currentRepo.full_name, branchName);
      }
    } catch (error) {
      console.error('useGithubRepos - Error selecting branch:', error);
      toast({
        title: "Error selecting branch",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [currentRepo, fetchFiles, toast]);

  const reset = useCallback(() => {
    console.log('useGithubRepos - Resetting state');
    setRepositories([]);
    setBranches([]);
    setCurrentRepo(null);
    setCurrentBranch(null);
    setFiles([]);
    isFetchingRef.current = false;
  }, []);

  // Add more robust error handling for the hook
  useEffect(() => {
    // Add event listeners for unhandled errors
    const handleError = (event: ErrorEvent) => {
      console.error('useGithubRepos - Unhandled error:', event.error);
      // Reset the fetching state to prevent getting stuck
      isFetchingRef.current = false;
      setIsLoading(false);
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  const fetchFileContent = useCallback(async (filePath: string): Promise<string | null> => {
    if (!token || !currentRepo || !currentBranch) {
      console.log('useGithubRepos - Cannot fetch file content: missing data');
      return null;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubRepos - Operation throttled, please wait');
      return null;
    }
    
    console.log(`useGithubRepos - Fetching content for ${filePath}`);
    setIsLoading(true);
    lastOperationTimeRef.current = Date.now();
    
    try {
      const content = await repositoryService.fetchFileContent(
        currentRepo.full_name, 
        filePath, 
        currentBranch
      );
      console.log(`useGithubRepos - Content fetched, length: ${content?.length || 0}`);
      return content;
    } catch (error) {
      console.error('useGithubRepos - Error fetching file content:', error);
      toast({
        title: "Failed to load file content",
        description: "Please check file access and try again",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token, currentRepo, currentBranch, repositoryService, toast, shouldThrottle]);

  const saveFileToRepo = useCallback(async (filePath: string, content: string, commitMessage: string) => {
    if (!token || !currentRepo || !currentBranch) {
      console.log('useGithubRepos - Cannot save file: missing data');
      return false;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubRepos - Operation throttled, please wait');
      toast({
        title: "Please wait",
        description: "Too many operations in quick succession",
      });
      return false;
    }
    
    console.log(`useGithubRepos - Saving file ${filePath} to repo ${currentRepo.full_name} (${currentBranch})`);
    setIsLoading(true);
    lastOperationTimeRef.current = Date.now();
    
    try {
      const result = await repositoryService.saveFileToRepo(
        currentRepo.full_name, 
        filePath, 
        content, 
        commitMessage, 
        currentBranch
      );
      console.log(`useGithubRepos - Save result: ${result}`);
      return result;
    } catch (error) {
      console.error('useGithubRepos - Error saving file to repo:', error);
      toast({
        title: "Failed to save file",
        description: "Please check repository access and try again",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [token, currentRepo, currentBranch, repositoryService, toast, shouldThrottle]);

  const syncRepoToFileSystem = useCallback(async (
    owner: string, 
    repo: string, 
    branch: string,
    createFile: (path: string, name: string, content: string) => Promise<void>,
    createFolder: (path: string, name: string) => Promise<void>
  ) => {
    if (!token) {
      console.log('useGithubRepos - Cannot sync repo: no token');
      return false;
    }
    
    // Prevent concurrent operations
    if (isFetchingRef.current) {
      console.log('useGithubRepos - Already syncing repository, aborting');
      toast({
        title: "Sync in progress",
        description: "Please wait for the current sync to complete",
      });
      return false;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubRepos - Operation throttled, please wait');
      toast({
        title: "Please wait",
        description: "Please wait a moment before trying again",
      });
      return false;
    }
    
    console.log(`useGithubRepos - Syncing repo ${owner}/${repo} (${branch}) to file system`);
    setIsLoading(true);
    isFetchingRef.current = true;
    lastOperationTimeRef.current = Date.now();
    
    try {
      const result = await syncService.syncRepoToFileSystem(
        owner,
        repo,
        branch,
        createFile,
        createFolder
      );
      console.log(`useGithubRepos - Sync result: ${result}`);
      return result;
    } catch (error) {
      console.error('useGithubRepos - Error syncing repo to file system:', error);
      toast({
        title: "Sync failed",
        description: "Failed to import repository files",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
      
      // Add extra delay after sync operation
      setTimeout(() => {
        console.log('useGithubRepos - Sync cooldown complete');
      }, COOLDOWN_MS * 2);
    }
  }, [token, syncService, toast, shouldThrottle]);

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
    reset
  };
};
