
import { useState, useRef, useEffect } from 'react';
import { GithubTokenService } from '@/services/github/githubTokenService';
import { GitHubAuthState } from '@/types/github';
import { useToast } from '@/hooks/use-toast';

export const useGitHubAuth = (
  user: { id: string } | null,
  authState: GitHubAuthState,
  logout: () => void
) => {
  const { toast } = useToast();
  const tokenSavedRef = useRef(false);
  const authInitializedRef = useRef(false);
  const lastAuthStateRef = useRef({ 
    isAuthenticated: false, 
    token: null as string | null,
    username: null as string | null
  });

  // Handle saving token when authentication changes
  useEffect(() => {
    const saveToken = async () => {
      if (!user || !user.id) {
        console.log('useGitHubAuth - No user, skipping token save');
        return;
      }
      
      if (!authState.isAuthenticated || !authState.token) {
        console.log('useGitHubAuth - Not authenticated or no token, skipping save');
        return;
      }
      
      if (tokenSavedRef.current) {
        console.log('useGitHubAuth - Token already saved, skipping duplicate save');
        return;
      }
      
      try {
        console.log('useGitHubAuth - Saving token for user:', user.id);
        await GithubTokenService.saveToken(user.id, authState.token, authState.username || '');
        console.log('useGitHubAuth - GitHub token saved to database');
        tokenSavedRef.current = true; // Mark as saved to prevent repeated saves
        
        // Only show toast if authentication state changed
        if (!lastAuthStateRef.current.isAuthenticated || 
            lastAuthStateRef.current.username !== authState.username) {
          toast({
            title: "Connected to GitHub",
            description: `Successfully connected as ${authState.username}`,
          });
        }
      } catch (error) {
        console.error('useGitHubAuth - Error saving GitHub token:', error);
      }
      
      // Update last auth state reference
      lastAuthStateRef.current = {
        isAuthenticated: authState.isAuthenticated,
        token: authState.token,
        username: authState.username
      };
    };
    
    saveToken();
  }, [authState.isAuthenticated, authState.token, authState.username, user, toast]);

  // Handle logout with token cleanup
  const handleLogout = async () => {
    if (user && user.id) {
      try {
        console.log('useGitHubAuth - Logging out user:', user.id);
        await GithubTokenService.deleteToken(user.id);
        tokenSavedRef.current = false; // Reset the token saved flag
        authInitializedRef.current = false; // Reset the auth initialized flag
        localStorage.removeItem('githubRepoInfo');
        
        // Clear GitHub-related memory
        const MemoryService = (await import('@/services/MemoryService')).MemoryService;
        await MemoryService.storeMemory(user.id, 'github_context', null);
      } catch (error) {
        console.error('useGitHubAuth - Error deleting GitHub token:', error);
      }
    }
    logout();
  };

  return {
    handleLogout,
    isAuthInitialized: authInitializedRef.current,
    setAuthInitialized: (value: boolean) => {
      authInitializedRef.current = value;
    }
  };
};
