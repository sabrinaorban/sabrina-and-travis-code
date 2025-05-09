import { useState, useRef, useCallback } from 'react';
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
  const apiService = new GithubApiService({ 
    token,
    userId: user?.id 
  });
  
  const repositoryService = new GithubRepositoryService(apiService, toast);
  const syncService = new GithubSyncService(apiService, toast);

  // Helper to check if we should throttle operations
  const shouldThrottle = () => {
    const now = Date.now();
    return now - lastOperationTimeRef.current < COOLDOWN_MS;
  };

  const fetchRepositories = async () => {
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
  };

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
  }, [token, branches, repositoryService, toast]);

  const fetchFiles = async (repoFullName: string, branchName: string) => {
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
  };

  const selectRepository = async (repo: GitHubRepo) => {
    console.log(`useGithubRepos - Selecting repository: ${repo.full_name}`);
    
    // Set the current repository first
    setCurrentRepo(repo);
    
    // Clear branches when selecting a new repo to prevent stale data
    setBranches([]);
    setCurrentBranch(null);
    setFiles([]);
    
    // Don't wait - immediately fetch branches
    fetchBranches(repo.full_name);
  };

  const selectBranch = async (branchName: string) => {
    console.log(`useGithubRepos - Selecting branch: ${branchName}`);
    
    // Set the current branch
    setCurrentBranch(branchName);
    
    // Clear files when selecting a new branch to prevent stale data
    setFiles([]);
    
    if (currentRepo) {
      // Fetch files for the selected branch
      fetchFiles(currentRepo.full_name, branchName);
    }
  };

  const fetchFileContent = async (filePath: string): Promise<string | null> => {
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
  };

  const saveFileToRepo = async (filePath: string, content: string, commitMessage: string) => {
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
  };

  const syncRepoToFileSystem = async (
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
  };

  const reset = () => {
    console.log('useGithubRepos - Resetting state');
    setRepositories([]);
    setBranches([]);
    setCurrentRepo(null);
    setCurrentBranch(null);
    setFiles([]);
    isFetchingRef.current = false;
  };

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
