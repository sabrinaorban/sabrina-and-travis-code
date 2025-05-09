
import { useState, useRef, useCallback } from 'react';
import { GitHubFile } from '@/types/github';
import { GithubRepositoryService } from '@/services/github/githubRepositoryService';
import { useToast } from '@/hooks/use-toast';
import { useGithubThrottling } from './useGithubThrottling';

export const useGithubFiles = (
  token: string | null,
  repositoryService: GithubRepositoryService,
  isFetchingRef: React.MutableRefObject<boolean>
) => {
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { shouldThrottle, updateLastOperationTime } = useGithubThrottling();

  const fetchFiles = useCallback(async (repoFullName: string, branchName: string) => {
    if (!token) {
      console.log('useGithubFiles - Cannot fetch files: no token');
      return [];
    }
    
    // Prevent concurrent operations
    if (isFetchingRef.current) {
      console.log('useGithubFiles - Already fetching files, aborting');
      return files;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubFiles - Operation throttled, please wait');
      return files;
    }
    
    console.log(`useGithubFiles - Fetching files for ${repoFullName} (${branchName})`);
    setIsLoading(true);
    isFetchingRef.current = true;
    updateLastOperationTime();
    
    try {
      const filesList = await repositoryService.fetchFiles(repoFullName, branchName);
      console.log(`useGithubFiles - Fetched ${filesList.length} files`);
      setFiles(filesList);
      return filesList;
    } catch (error) {
      console.error('useGithubFiles - Error fetching files:', error);
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
  }, [token, files, repositoryService, toast, shouldThrottle, updateLastOperationTime, isFetchingRef]);

  const fetchFileContent = useCallback(async (
    repoFullName: string, 
    filePath: string, 
    branchName: string
  ): Promise<string | null> => {
    if (!token) {
      console.log('useGithubFiles - Cannot fetch file content: no token');
      return null;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubFiles - Operation throttled, please wait');
      return null;
    }
    
    console.log(`useGithubFiles - Fetching content for ${filePath}`);
    setIsLoading(true);
    updateLastOperationTime();
    
    try {
      const content = await repositoryService.fetchFileContent(
        repoFullName, 
        filePath, 
        branchName
      );
      console.log(`useGithubFiles - Content fetched, length: ${content?.length || 0}`);
      return content;
    } catch (error) {
      console.error('useGithubFiles - Error fetching file content:', error);
      toast({
        title: "Failed to load file content",
        description: "Please check file access and try again",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token, repositoryService, toast, shouldThrottle, updateLastOperationTime]);

  return {
    files,
    setFiles,
    fetchFiles,
    fetchFileContent,
    isLoading
  };
};
