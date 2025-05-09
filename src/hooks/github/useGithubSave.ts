
import { useState, useCallback } from 'react';
import { GithubRepositoryService } from '@/services/github/githubRepositoryService';
import { useToast } from '@/hooks/use-toast';
import { useGithubThrottling } from './useGithubThrottling';

export const useGithubSave = (
  token: string | null,
  repositoryService: GithubRepositoryService
) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { shouldThrottle, updateLastOperationTime } = useGithubThrottling();

  const saveFileToRepo = useCallback(async (
    repoFullName: string,
    filePath: string,
    content: string,
    commitMessage: string,
    branchName: string
  ) => {
    if (!token) {
      console.log('useGithubSave - Cannot save file: no token');
      return false;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubSave - Operation throttled, please wait');
      toast({
        title: "Please wait",
        description: "Too many operations in quick succession",
      });
      return false;
    }
    
    console.log(`useGithubSave - Saving file ${filePath} to repo ${repoFullName} (${branchName})`);
    setIsLoading(true);
    updateLastOperationTime();
    
    try {
      const result = await repositoryService.saveFileToRepo(
        repoFullName, 
        filePath, 
        content, 
        commitMessage, 
        branchName
      );
      console.log(`useGithubSave - Save result: ${result}`);
      return result;
    } catch (error) {
      console.error('useGithubSave - Error saving file to repo:', error);
      toast({
        title: "Failed to save file",
        description: "Please check repository access and try again",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [token, repositoryService, toast, shouldThrottle, updateLastOperationTime]);

  return {
    saveFileToRepo,
    isLoading
  };
};
