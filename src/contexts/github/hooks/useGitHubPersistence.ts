
import { useEffect, useRef } from 'react';
import { GitHubRepo } from '@/types/github';

// Storage keys for session persistence
export const STORAGE_KEY_REPO = 'github_current_repo';
export const STORAGE_KEY_BRANCH = 'github_current_branch';

/**
 * Hook to handle GitHub repository and branch persistence across sessions
 */
export const useGitHubPersistence = (
  currentRepo: GitHubRepo | null,
  currentBranch: string | null,
  repositories: GitHubRepo[],
  isAuthenticated: boolean,
  isLoading: boolean,
  setCurrentRepo: (repo: GitHubRepo) => void,
  setCurrentBranch: (branch: string) => void,
  selectRepository: (repo: GitHubRepo) => Promise<void>
) => {
  // Track if we've attempted to restore from storage
  const hasAttemptedRestoreRef = useRef<boolean>(false);
  
  // Store current selection in sessionStorage and localStorage when it changes
  useEffect(() => {
    if (currentRepo && currentBranch) {
      console.log(`useGitHubPersistence - Saving repo info to storage: ${currentRepo.full_name} (${currentBranch})`);
      
      // Store in localStorage for long-term persistence
      localStorage.setItem('githubRepoInfo', JSON.stringify({
        repoFullName: currentRepo.full_name,
        branchName: currentBranch
      }));
      
      // Store in sessionStorage for current session persistence
      sessionStorage.setItem(STORAGE_KEY_REPO, JSON.stringify(currentRepo));
      sessionStorage.setItem(STORAGE_KEY_BRANCH, currentBranch);
    }
  }, [currentRepo, currentBranch]);

  // Restore repository and branch from storage on initial load
  useEffect(() => {
    // Only attempt restoration once
    if (hasAttemptedRestoreRef.current) {
      return;
    }
    
    // Only attempt restoration when authenticated with repos loaded
    if (isAuthenticated && repositories.length > 0 && !currentRepo && !isLoading) {
      hasAttemptedRestoreRef.current = true;
      
      try {
        // Try to restore from sessionStorage first
        const storedRepoJSON = sessionStorage.getItem(STORAGE_KEY_REPO);
        const storedBranch = sessionStorage.getItem(STORAGE_KEY_BRANCH);
        
        if (storedRepoJSON && storedBranch) {
          const storedRepo = JSON.parse(storedRepoJSON);
          console.log(`useGitHubPersistence - Restoring repo from session: ${storedRepo.full_name} (${storedBranch})`);
          
          // Find matching repo in loaded repositories
          const matchingRepo = repositories.find(r => r.id === storedRepo.id);
          
          if (matchingRepo) {
            // Set current repo and branch directly
            setCurrentRepo(matchingRepo);
            setCurrentBranch(storedBranch);
            
            // Use selectRepository to load branches
            selectRepository(matchingRepo).catch(console.error);
          } else {
            console.log('useGitHubPersistence - Could not find matching repo in loaded repositories');
          }
        }
      } catch (error) {
        console.error('useGitHubPersistence - Error restoring repo from session storage:', error);
      }
    }
  }, [isAuthenticated, repositories, currentRepo, isLoading, setCurrentRepo, setCurrentBranch, selectRepository]);
};
