
import { useState, useRef, useCallback } from 'react';
import { GitHubRepo } from '@/types/github';
import { GithubRepositoryService } from '@/services/github/githubRepositoryService';
import { useToast } from '@/hooks/use-toast';
import { useGithubThrottling } from './useGithubThrottling';

export const useGithubRepositories = (
  token: string | null,
  repositoryService: GithubRepositoryService,
  isFetchingRef: React.MutableRefObject<boolean>
) => {
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { shouldThrottle, updateLastOperationTime } = useGithubThrottling();

  const fetchRepositories = useCallback(async () => {
    if (!token) {
      console.log('useGithubRepositories - Cannot fetch repos: no token');
      return [];
    }
    
    // Prevent concurrent operations
    if (isFetchingRef.current) {
      console.log('useGithubRepositories - Already fetching repositories, aborting');
      return repositories;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubRepositories - Operation throttled, please wait');
      return repositories;
    }
    
    console.log('useGithubRepositories - Fetching repositories');
    setIsLoading(true);
    isFetchingRef.current = true;
    updateLastOperationTime();
    
    try {
      const repos = await repositoryService.fetchRepositories();
      console.log(`useGithubRepositories - Fetched ${repos.length} repositories`);
      setRepositories(repos);
      return repos;
    } catch (error) {
      console.error('useGithubRepositories - Error fetching repositories:', error);
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
  }, [token, repositories, repositoryService, toast, shouldThrottle, updateLastOperationTime, isFetchingRef]);

  return {
    repositories,
    fetchRepositories,
    isLoading
  };
};
