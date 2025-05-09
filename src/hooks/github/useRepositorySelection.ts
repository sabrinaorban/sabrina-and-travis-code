
import { useState, useRef } from 'react';
import { GitHubRepo } from '@/types/github';

export const useRepositorySelection = (
  selectRepository: (repo: GitHubRepo) => Promise<void>,
  selectBranch: (branch: string) => Promise<void>
) => {
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  
  // Track repo selection to prevent race conditions
  const selectingRepoRef = useRef(false);
  const branchSelectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle repository selection with debounce for UI feedback
  const handleRepositoryChange = async (repoFullName: string, repositories: GitHubRepo[]) => {
    try {
      // Prevent multiple concurrent repo selections
      if (selectingRepoRef.current) {
        console.log('useRepositorySelection - Repository selection in progress, debouncing...');
        return;
      }
      
      setIsFetchingBranches(true);
      selectingRepoRef.current = true;
      
      console.log('useRepositorySelection - Repository selected:', repoFullName);
      const repo = repositories?.find(r => r.full_name === repoFullName);
      
      if (repo) {
        await selectRepository(repo);
        
        // Clean up any existing timeout
        if (branchSelectionTimeoutRef.current) {
          clearTimeout(branchSelectionTimeoutRef.current);
        }
        
        // Add a small delay to allow branches to load
        branchSelectionTimeoutRef.current = setTimeout(() => {
          setIsFetchingBranches(false);
          selectingRepoRef.current = false;
        }, 1500);
      } else {
        setIsFetchingBranches(false);
        selectingRepoRef.current = false;
      }
    } catch (error) {
      console.error('useRepositorySelection - Error in handleRepositoryChange:', error);
      setIsFetchingBranches(false);
      selectingRepoRef.current = false;
    }
  };

  // Handle branch selection with error handling
  const handleBranchChange = async (branch: string) => {
    try {
      console.log('useRepositorySelection - Branch selected:', branch);
      await selectBranch(branch);
    } catch (error) {
      console.error('useRepositorySelection - Error in handleBranchChange:', error);
    }
  };
  
  // Clean up timeouts when hook unmounts
  const cleanup = () => {
    if (branchSelectionTimeoutRef.current) {
      clearTimeout(branchSelectionTimeoutRef.current);
    }
  };

  return {
    isFetchingBranches,
    selectingRepoRef,
    handleRepositoryChange,
    handleBranchChange,
    cleanup
  };
};
