
import { useState, useRef, useCallback } from 'react';
import { GitHubBranch } from '@/types/github';
import { GithubRepositoryService } from '@/services/github/githubRepositoryService';
import { useToast } from '@/hooks/use-toast';
import { useGithubThrottling } from './useGithubThrottling';

export const useGithubBranches = (
  token: string | null,
  repositoryService: GithubRepositoryService,
  isFetchingRef: React.MutableRefObject<boolean>
) => {
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { shouldThrottle, updateLastOperationTime } = useGithubThrottling();

  const fetchBranches = useCallback(async (repoFullName: string) => {
    if (!token) {
      console.log('useGithubBranches - Cannot fetch branches: no token');
      return [];
    }
    
    // Prevent concurrent operations
    if (isFetchingRef.current) {
      console.log('useGithubBranches - Already fetching branches, aborting');
      return branches;
    }
    
    // Apply throttling
    if (shouldThrottle()) {
      console.log('useGithubBranches - Operation throttled, please wait');
      return branches;
    }
    
    console.log(`useGithubBranches - Fetching branches for ${repoFullName}`);
    setIsLoading(true);
    isFetchingRef.current = true;
    updateLastOperationTime();
    
    try {
      const branchList = await repositoryService.fetchBranches(repoFullName);
      console.log(`useGithubBranches - Fetched ${branchList.length} branches`);
      setBranches(branchList);
      return branchList;
    } catch (error) {
      console.error('useGithubBranches - Error fetching branches:', error);
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
  }, [token, branches, repositoryService, toast, shouldThrottle, updateLastOperationTime, isFetchingRef]);

  return {
    branches,
    fetchBranches,
    setBranches,
    isLoading
  };
};
