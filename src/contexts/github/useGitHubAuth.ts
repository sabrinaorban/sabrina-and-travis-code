
import { useRef, useEffect } from 'react';
import { GithubTokenService } from '@/services/github/githubTokenService';
import { GitHubAuthState } from '@/types/github';
import { useToast } from '@/hooks/use-toast';
import { useGithubAuth as useOriginalGithubAuth } from '@/hooks/useGithubAuth';

export interface GitHubAuthResult {
  authState: GitHubAuthState;
  authenticate: (token: string) => Promise<void>;
  logout: () => void;
  handleLogout?: () => Promise<void>;
  isAuthInitialized?: boolean;
  setAuthInitialized?: (value: boolean) => void;
}

export const useGitHubAuth = (
  user?: { id: string } | null,
  authState?: GitHubAuthState,
  logoutFn?: () => void
): GitHubAuthResult => {
  const { toast } = useToast();
  const tokenSavedRef = useRef(false);
  const authInitializedRef = useRef(false);
  const authenticationInProgress = useRef(false);
  const lastAuthStateRef = useRef({ 
    isAuthenticated: false, 
    token: null as string | null,
    username: null as string | null
  });
  
  // When used without parameters, call the original hook
  if (!user && !authState && !logoutFn) {
    return useOriginalGithubAuth();
  }

  // Handle saving token when authentication changes
  useEffect(() => {
    if (!user || !user.id || !authState || !authState.isAuthenticated || !authState.token) {
      return;
    }
    
    const saveToken = async () => {
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
  }, [authState?.isAuthenticated, authState?.token, authState?.username, user?.id, toast]);

  // Handle logout with token cleanup
  const handleLogout = async () => {
    if (!user || !user.id || !logoutFn) {
      console.error('useGitHubAuth - Cannot logout: missing user or logout function');
      return;
    }

    try {
      console.log('useGitHubAuth - Logging out user:', user.id);
      await GithubTokenService.deleteToken(user.id);
      tokenSavedRef.current = false; // Reset the token saved flag
      authInitializedRef.current = false; // Reset the auth initialized flag
      localStorage.removeItem('githubRepoInfo');
      
      // Clear GitHub-related memory
      const MemoryService = (await import('@/services/MemoryService')).MemoryService;
      await MemoryService.storeMemory(user.id, 'github_context', null);
      
      // Call the provided logout function
      logoutFn();
    } catch (error) {
      console.error('useGitHubAuth - Error deleting GitHub token:', error);
      // Still try to logout even if there was an error
      if (logoutFn) logoutFn();
    }
  };

  // Return a consistent object shape regardless of how the hook is used
  return {
    authState: authState || {
      isAuthenticated: false,
      token: null,
      username: null,
      loading: false,
      error: null
    },
    authenticate: async (token: string) => {
      // Prevent multiple simultaneous authentication attempts
      if (authenticationInProgress.current) {
        console.log('Authentication already in progress, skipping duplicate request');
        return;
      }
      
      try {
        authenticationInProgress.current = true;
        // Use a separate function to handle authentication
        const originalAuth = useOriginalGithubAuth();
        if (originalAuth.authenticate) {
          await originalAuth.authenticate(token);
        } else {
          console.warn('authenticate not implemented in this context');
        }
      } finally {
        // Clear the lock after a delay
        setTimeout(() => {
          authenticationInProgress.current = false;
        }, 1000);
      }
    },
    logout: logoutFn || (() => {
      console.warn('logout not implemented in this context');
    }),
    handleLogout,
    isAuthInitialized: authInitializedRef.current,
    setAuthInitialized: (value: boolean) => {
      authInitializedRef.current = value;
    }
  };
};
