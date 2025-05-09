
import { useCallback } from 'react';
import { MemoryService } from '@/services/MemoryService';
import { GitHubAuthState } from '@/types/github';
import { GitHubMemoryData } from './githubContextTypes';

export const useGitHubMemory = () => {
  // Load GitHub contextual memory
  const loadGitHubMemory = useCallback(async (
    userId: string | undefined, 
    authState: GitHubAuthState
  ) => {
    if (!userId || !authState.isAuthenticated) {
      console.log('useGitHubMemory - Cannot load memory: missing user or not authenticated');
      return;
    }
    
    try {
      console.log('useGitHubMemory - Loading GitHub memory for user:', userId);
      
      // Fetch recent repositories
      const recentRepos = await MemoryService.retrieveMemory(userId, 'github_recent_repositories');
      
      // Fetch recent file interactions
      const recentFiles = await MemoryService.retrieveMemory(userId, 'github_recent_files');
      
      // Fetch recent commit history
      const commitHistory = await MemoryService.retrieveMemory(userId, 'github_commit_history');
      
      console.log('useGitHubMemory - Loaded GitHub memory context:', { 
        recentRepositories: recentRepos,
        recentFiles: recentFiles,
        commitHistory: commitHistory?.length || 0
      });
      
      // Store this context in memory for the AI
      const memoryData: GitHubMemoryData = {
        recentRepositories: recentRepos,
        recentFiles: recentFiles,
        commitHistory: commitHistory,
        lastAccessed: new Date().toISOString(),
        username: authState.username
      };
      
      await MemoryService.storeMemory(userId, 'github_context', memoryData);
      
    } catch (error) {
      console.error('useGitHubMemory - Error loading GitHub memory:', error);
    }
  }, []);

  // Store sync operation in memory
  const storeGitHubSync = useCallback(async (
    userId: string | undefined,
    owner: string,
    repo: string,
    branch: string,
    success: boolean
  ) => {
    if (!userId) {
      return;
    }
    
    try {
      await MemoryService.storeMemory(userId, 'github_last_sync', {
        owner,
        repo,
        branch,
        timestamp: new Date().toISOString(),
        success
      });
    } catch (error) {
      console.error('useGitHubMemory - Error storing sync data:', error);
    }
  }, []);

  return {
    loadGitHubMemory,
    storeGitHubSync
  };
};
