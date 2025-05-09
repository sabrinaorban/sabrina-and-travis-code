
import { useState, useEffect } from 'react';
import { GithubTokenService } from '@/services/github/githubTokenService';

/**
 * Hook to handle GitHub context initialization
 */
export const useGitHubInit = (
  user: any,
  authenticate: (token: string) => Promise<void>,
  isAuthInitialized: boolean,
  setAuthInitialized: (initialized: boolean) => void
) => {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Load saved GitHub token when user changes
  useEffect(() => {
    const loadSavedToken = async () => {
      if (user && user.id && !isAuthInitialized) {
        try {
          console.log('useGitHubInit - Loading saved token for user:', user.id);
          setIsInitializing(true);
          const tokenData = await GithubTokenService.loadToken(user.id);
          if (tokenData && tokenData.token) {
            console.log('useGitHubInit - Found saved GitHub token, restoring session');
            await authenticate(tokenData.token);
            setAuthInitialized(true);
          } else {
            console.log('useGitHubInit - No saved GitHub token found');
          }
        } catch (error) {
          console.error('useGitHubInit - Error loading GitHub token:', error);
        } finally {
          setIsInitializing(false);
        }
      } else if (!user) {
        console.log('useGitHubInit - No user, skipping token load');
        setIsInitializing(false);
      }
    };
    
    loadSavedToken();
  }, [user, authenticate, isAuthInitialized, setAuthInitialized]);

  return { isInitializing };
};
