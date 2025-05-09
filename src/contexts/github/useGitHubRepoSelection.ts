
import { useState, useEffect, useRef, useCallback } from 'react';
import { GitHubRepo } from '@/types/github';
import { useToast } from '@/hooks/use-toast';

export const useGitHubRepoSelection = (
  authState: { isAuthenticated: boolean; username: string | null },
  fetchRepositories: () => Promise<GitHubRepo[]>,
  selectRepository: (repo: GitHubRepo) => Promise<void>,
  selectBranch: (branchName: string) => Promise<void>
) => {
  const isRestoringRepoRef = useRef(false);
  const hasAttemptedRestoreRef = useRef(false);
  const { toast } = useToast();

  // Restore repository selection from localStorage
  const restoreRepoSelection = useCallback(async (repositories: GitHubRepo[]) => {
    // Check if we already attempted to restore the repo to prevent loops
    if (hasAttemptedRestoreRef.current || isRestoringRepoRef.current) {
      console.log('useGitHubRepoSelection - Already attempted to restore repo selection, skipping');
      return;
    }
    
    console.log('useGitHubRepoSelection - Attempting to restore repo selection');
    
    // Get stored repo info
    const storedRepoInfo = localStorage.getItem('githubRepoInfo');
    if (!storedRepoInfo) {
      console.log('useGitHubRepoSelection - No stored repo info found');
      hasAttemptedRestoreRef.current = true;
      return;
    }
    
    try {
      console.log('useGitHubRepoSelection - Found stored repo info:', storedRepoInfo);
      const { repoFullName, branchName } = JSON.parse(storedRepoInfo);
      
      if (!repoFullName) {
        console.log('useGitHubRepoSelection - No repo name in stored info');
        hasAttemptedRestoreRef.current = true;
        return;
      }
      
      console.log('useGitHubRepoSelection - Found repo to restore:', repoFullName);
      isRestoringRepoRef.current = true;
      hasAttemptedRestoreRef.current = true;
      
      // Find the repository in the list
      const repo = repositories.find(r => r.full_name === repoFullName);
      
      if (repo) {
        console.log('useGitHubRepoSelection - Restoring repo selection:', repo.full_name);
        await selectRepository(repo);
        
        // Wait a moment to allow branches to load
        if (branchName) {
          console.log('useGitHubRepoSelection - Restoring branch selection:', branchName);
          // Use setTimeout to avoid immediate state updates
          setTimeout(async () => {
            try {
              await selectBranch(branchName);
              console.log('useGitHubRepoSelection - Branch selection restored');
            } catch (error) {
              console.error('useGitHubRepoSelection - Error restoring branch selection:', error);
            } finally {
              isRestoringRepoRef.current = false;
            }
          }, 1500);
        } else {
          isRestoringRepoRef.current = false;
        }
      } else {
        console.log('useGitHubRepoSelection - Stored repo not found in list:', repoFullName);
        isRestoringRepoRef.current = false;
      }
    } catch (error) {
      console.error('useGitHubRepoSelection - Error restoring repo info:', error);
      isRestoringRepoRef.current = false;
      hasAttemptedRestoreRef.current = true;
    }
  }, [selectRepository, selectBranch]);

  // Load repositories and restore selection when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && !hasAttemptedRestoreRef.current) {
      console.log('useGitHubRepoSelection - Authenticated, loading repositories for selection restoration');
      
      const initializeRepoSelection = async () => {
        try {
          // Fetch repositories first
          const repos = await fetchRepositories();
          
          if (repos.length > 0) {
            console.log(`useGitHubRepoSelection - Fetched ${repos.length} repositories, attempting to restore selection`);
            await restoreRepoSelection(repos);
          } else {
            console.log('useGitHubRepoSelection - No repositories found, skipping restore');
            hasAttemptedRestoreRef.current = true;
          }
        } catch (error) {
          console.error('useGitHubRepoSelection - Error initializing repo selection:', error);
          hasAttemptedRestoreRef.current = true;
        }
      };
      
      initializeRepoSelection();
    }
  }, [authState.isAuthenticated, fetchRepositories, restoreRepoSelection]);

  // Return the flag to indicate if restoration is in progress
  return {
    isRestoringRepo: () => isRestoringRepoRef.current,
    hasAttemptedRestore: () => hasAttemptedRestoreRef.current,
    resetRestoreState: () => {
      hasAttemptedRestoreRef.current = false;
    }
  };
};
