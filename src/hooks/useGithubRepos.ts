
import { useState } from 'react';
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

  const fetchRepositories = async () => {
    if (!token) {
      console.log('useGithubRepos - Cannot fetch repos: no token');
      return [];
    }
    
    console.log('useGithubRepos - Fetching repositories');
    setIsLoading(true);
    try {
      const repos = await repositoryService.fetchRepositories();
      console.log(`useGithubRepos - Fetched ${repos.length} repositories`);
      setRepositories(repos);
      return repos;
    } catch (error) {
      console.error('useGithubRepos - Error fetching repositories:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranches = async (repoFullName: string) => {
    if (!token) {
      console.log('useGithubRepos - Cannot fetch branches: no token');
      return [];
    }
    
    console.log(`useGithubRepos - Fetching branches for ${repoFullName}`);
    setIsLoading(true);
    try {
      const branchList = await repositoryService.fetchBranches(repoFullName);
      console.log(`useGithubRepos - Fetched ${branchList.length} branches`);
      setBranches(branchList);
      return branchList;
    } catch (error) {
      console.error('useGithubRepos - Error fetching branches:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async (repoFullName: string, branchName: string) => {
    if (!token) {
      console.log('useGithubRepos - Cannot fetch files: no token');
      return [];
    }
    
    console.log(`useGithubRepos - Fetching files for ${repoFullName} (${branchName})`);
    setIsLoading(true);
    try {
      const filesList = await repositoryService.fetchFiles(repoFullName, branchName);
      console.log(`useGithubRepos - Fetched ${filesList.length} files`);
      setFiles(filesList);
      return filesList;
    } catch (error) {
      console.error('useGithubRepos - Error fetching files:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const selectRepository = async (repo: GitHubRepo) => {
    console.log(`useGithubRepos - Selecting repository: ${repo.full_name}`);
    setCurrentRepo(repo);
    await fetchBranches(repo.full_name);
  };

  const selectBranch = async (branchName: string) => {
    console.log(`useGithubRepos - Selecting branch: ${branchName}`);
    setCurrentBranch(branchName);
    if (currentRepo) {
      await fetchFiles(currentRepo.full_name, branchName);
    }
  };

  const fetchFileContent = async (filePath: string): Promise<string | null> => {
    if (!token || !currentRepo || !currentBranch) {
      console.log('useGithubRepos - Cannot fetch file content: missing data');
      return null;
    }
    
    console.log(`useGithubRepos - Fetching content for ${filePath}`);
    setIsLoading(true);
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
    
    console.log(`useGithubRepos - Saving file ${filePath} to repo ${currentRepo.full_name} (${currentBranch})`);
    setIsLoading(true);
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
    
    console.log(`useGithubRepos - Syncing repo ${owner}/${repo} (${branch}) to file system`);
    setIsLoading(true);
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
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    console.log('useGithubRepos - Resetting state');
    setRepositories([]);
    setBranches([]);
    setCurrentRepo(null);
    setCurrentBranch(null);
    setFiles([]);
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
