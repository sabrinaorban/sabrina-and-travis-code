
import { useState, useEffect, useRef } from 'react';
import { GithubTokenService } from '@/services/github/githubTokenService';

/**
 * Hook to initialize GitHub authentication on app start
 */
export const useGitHubInit = (
  user?: { id: string } | null,
  authenticate: (token: string) => Promise<void>,
  isAuthInitialized?: boolean,
  setAuthInitialized?: (value: boolean) => void
) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const initializationAttempted = useRef(false);
  
  // Load saved token and authenticate on component mount
  useEffect(() => {
    const initializeGitHub = async () => {
      // Skip if already initialized or if initialization is in progress
      if (isAuthInitialized || !setAuthInitialized || initializationAttempted.current || !user?.id) {
        return;
      }
      
      initializationAttempted.current = true;
      setIsInitializing(true);
      
      try {
        console.log('useGitHubInit - Loading saved token for user:', user.id);
        const tokenData = await GithubTokenService.loadToken(user.id);
        
        if (tokenData && tokenData.token) {
          console.log('useGitHubInit - Found saved GitHub token, restoring session');
          await authenticate(tokenData.token);
        }
        
        setAuthInitialized(true);
      } catch (error) {
        console.error('useGitHubInit - Error initializing GitHub auth:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeGitHub();
  }, [user?.id, authenticate, isAuthInitialized, setAuthInitialized]);
  
  return { isInitializing };
};
