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
  
  // Create API service with both token and userId if available
  const apiService = new GithubApiService({ 
    token,
    userId: user?.id 
  });
  
  const repositoryService = new GithubRepositoryService(apiService, toast);
  const syncService = new GithubSyncService(apiService, toast);

  const fetchRepositories = async () => {
    if (!token) return [];
    
    setIsLoading(true);
    try {
      const repos = await repositoryService.fetchRepositories();
      setRepositories(repos);
      return repos;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranches = async (repoFullName: string) => {
    if (!token) return [];
    
    setIsLoading(true);
    try {
      const branchList = await repositoryService.fetchBranches(repoFullName);
      setBranches(branchList);
      return branchList;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async (repoFullName: string, branchName: string) => {
    if (!token) return [];
    
    setIsLoading(true);
    try {
      const filesList = await repositoryService.fetchFiles(repoFullName, branchName);
      setFiles(filesList);
      return filesList;
    } finally {
      setIsLoading(false);
    }
  };

  const selectRepository = async (repo: GitHubRepo) => {
    setCurrentRepo(repo);
    await fetchBranches(repo.full_name);
  };

  const selectBranch = async (branchName: string) => {
    setCurrentBranch(branchName);
    if (currentRepo) {
      await fetchFiles(currentRepo.full_name, branchName);
    }
  };

  const fetchFileContent = async (filePath: string): Promise<string | null> => {
    if (!token || !currentRepo || !currentBranch) return null;
    
    setIsLoading(true);
    try {
      return await repositoryService.fetchFileContent(
        currentRepo.full_name, 
        filePath, 
        currentBranch
      );
    } finally {
      setIsLoading(false);
    }
  };

  const saveFileToRepo = async (filePath: string, content: string, commitMessage: string) => {
    if (!token || !currentRepo || !currentBranch) return false;
    
    setIsLoading(true);
    try {
      return await repositoryService.saveFileToRepo(
        currentRepo.full_name, 
        filePath, 
        content, 
        commitMessage, 
        currentBranch
      );
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
    if (!token) return false;
    
    setIsLoading(true);
    try {
      return await syncService.syncRepoToFileSystem(
        owner,
        repo,
        branch,
        createFile,
        createFolder
      );
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
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
