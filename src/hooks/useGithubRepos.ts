
import { useState } from 'react';
import { GitHubRepo, GitHubBranch, GitHubFile } from '@/types/github';
import { GithubApiService } from '@/services/github/githubApiService';
import { toast } from '@/hooks/use-toast';

export const useGithubRepos = (token: string | null) => {
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [currentRepo, setCurrentRepo] = useState<GitHubRepo | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const apiService = new GithubApiService({ token });

  const fetchRepositories = async () => {
    if (!token) return [];
    
    setIsLoading(true);
    try {
      const repos = await apiService.fetchRepositories();
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
      const branchList = await apiService.fetchBranches(repoFullName);
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
      const filesList = await apiService.fetchFiles(repoFullName, branchName);
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
      return await apiService.fetchFileContent(currentRepo.full_name, filePath, currentBranch);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFileToRepo = async (filePath: string, content: string, commitMessage: string) => {
    if (!token || !currentRepo || !currentBranch) return false;
    
    setIsLoading(true);
    try {
      return await apiService.saveFileToRepo(
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
      // Fetch all repository contents recursively
      const allContents = await apiService.fetchDirectoryContents(owner, repo, '', branch);
      
      // First create all folders
      const folders = allContents.filter(item => item.type === 'folder');
      for (const folder of folders) {
        const folderPath = '/' + folder.path;
        const lastSlashIndex = folderPath.lastIndexOf('/');
        const parentPath = lastSlashIndex > 0 ? folderPath.substring(0, lastSlashIndex) : '/';
        const folderName = folderPath.substring(lastSlashIndex + 1);
        
        try {
          await createFolder(parentPath, folderName);
        } catch (error) {
          console.log(`Folder ${folderName} might already exist, continuing...`);
        }
      }
      
      // Then create all files
      const files = allContents.filter(item => item.type === 'file');
      for (const file of files) {
        const filePath = '/' + file.path;
        const lastSlashIndex = filePath.lastIndexOf('/');
        const parentPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : '/';
        const fileName = filePath.substring(lastSlashIndex + 1);
        
        try {
          await createFile(parentPath, fileName, file.content || '');
        } catch (error) {
          console.log(`Error creating file ${fileName}:`, error);
        }
      }
      
      console.log(`Synced ${folders.length} folders and ${files.length} files from ${owner}/${repo} (${branch}) to file system`);
      
      toast({
        title: 'Success',
        description: `Repository ${owner}/${repo} (${branch}) synced to file system`,
      });
      
      return true;
    } catch (error: any) {
      console.error('Error syncing repo:', error);
      toast({
        title: 'Error',
        description: `Failed to sync repository: ${error.message}`,
        variant: 'destructive',
      });
      return false;
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
