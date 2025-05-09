
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
    let createdFolders = 0;
    let createdFiles = 0;
    let errors = 0;
    
    try {
      console.log(`Starting sync of ${owner}/${repo} (${branch}) to file system...`);
      
      // Fetch all repository contents recursively
      const allContents = await apiService.fetchDirectoryContents(owner, repo, '', branch);
      console.log(`Fetched ${allContents.length} items from repository`);
      
      // Create a map to track folder creation status
      const folderCreationStatus = new Map<string, boolean>();
      folderCreationStatus.set('/', true); // Root folder always exists
      
      // First create all folders in depth order (sort by path length/depth)
      const folders = allContents
        .filter(item => item.type === 'folder')
        .sort((a, b) => {
          // Sort by path depth (count of slashes)
          const depthA = (a.path.match(/\//g) || []).length;
          const depthB = (b.path.match(/\//g) || []).length;
          return depthA - depthB;
        });
        
      console.log(`Creating ${folders.length} folders in order of depth`);
      
      // Create each folder
      for (const folder of folders) {
        const folderPath = '/' + folder.path;
        const lastSlashIndex = folderPath.lastIndexOf('/');
        const parentPath = lastSlashIndex > 0 ? folderPath.substring(0, lastSlashIndex) : '/';
        const folderName = folderPath.substring(lastSlashIndex + 1);
        
        // Skip if this exact folder was already created
        if (folderCreationStatus.get(folderPath)) {
          continue;
        }
        
        // Ensure all parent folders exist
        if (folderCreationStatus.get(parentPath)) {
          try {
            await createFolder(parentPath, folderName);
            folderCreationStatus.set(folderPath, true);
            createdFolders++;
            console.log(`Created folder: ${folderPath}`);
          } catch (error) {
            console.warn(`Folder ${folderName} at ${parentPath} might already exist, continuing...`);
            folderCreationStatus.set(folderPath, true); // Assume it exists if creation fails
          }
        } else {
          console.warn(`Cannot create folder ${folderPath} because parent ${parentPath} doesn't exist`);
          // Try to create parent folder first
          const parentLastSlashIndex = parentPath.lastIndexOf('/');
          const parentParentPath = parentLastSlashIndex > 0 ? parentPath.substring(0, parentLastSlashIndex) : '/';
          const parentFolderName = parentPath.substring(parentLastSlashIndex + 1);
          
          if (folderCreationStatus.get(parentParentPath)) {
            try {
              await createFolder(parentParentPath, parentFolderName);
              folderCreationStatus.set(parentPath, true);
              createdFolders++;
              console.log(`Created parent folder: ${parentPath}`);
              
              // Now try to create the original folder
              await createFolder(parentPath, folderName);
              folderCreationStatus.set(folderPath, true);
              createdFolders++;
              console.log(`Created folder: ${folderPath}`);
            } catch (error) {
              console.error(`Failed to create parent folder ${parentPath}:`, error);
              errors++;
            }
          }
        }
      }
      
      // Then create all files
      const files = allContents.filter(item => item.type === 'file');
      console.log(`Creating ${files.length} files`);
      
      for (const file of files) {
        const filePath = '/' + file.path;
        const lastSlashIndex = filePath.lastIndexOf('/');
        const parentPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : '/';
        const fileName = filePath.substring(lastSlashIndex + 1);
        
        // Ensure parent folder exists
        if (!folderCreationStatus.get(parentPath)) {
          // Create missing parent folder
          const parentLastSlashIndex = parentPath.lastIndexOf('/');
          const parentParentPath = parentLastSlashIndex > 0 ? parentPath.substring(0, parentLastSlashIndex) : '/';
          const parentFolderName = parentPath.substring(parentLastSlashIndex + 1);
          
          try {
            await createFolder(parentParentPath, parentFolderName);
            folderCreationStatus.set(parentPath, true);
            createdFolders++;
            console.log(`Created missing parent folder: ${parentPath}`);
          } catch (error) {
            console.warn(`Failed to create parent folder ${parentPath}, continuing...`);
            folderCreationStatus.set(parentPath, true); // Assume it exists anyway and try to create file
          }
        }
        
        // Now create the file
        if (folderCreationStatus.get(parentPath)) {
          try {
            // Make sure we have content, even if it's empty
            const content = file.content !== undefined ? file.content : '';
            await createFile(parentPath, fileName, content);
            createdFiles++;
            console.log(`Created file: ${filePath}`);
          } catch (error: any) {
            console.error(`Error creating file ${fileName} at ${parentPath}:`, error);
            errors++;
          }
        } else {
          console.warn(`Skipping file ${fileName} because parent ${parentPath} wasn't created`);
          errors++;
        }
      }
      
      console.log(`Synced ${createdFolders} folders and ${createdFiles} files from ${owner}/${repo} (${branch}) to file system. ${errors} errors.`);
      
      toast({
        title: 'Repository Synced',
        description: `Imported ${createdFiles} files and ${createdFolders} folders${errors > 0 ? ` (${errors} errors)` : ''}`,
      });
      
      return true;
    } catch (error: any) {
      console.error('Error syncing repo:', error);
      toast({
        title: 'Sync Failed',
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
