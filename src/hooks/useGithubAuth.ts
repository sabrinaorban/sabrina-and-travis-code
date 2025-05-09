
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GitHubAuthState } from '@/types/github';
import { GithubTokenService } from '@/services/github/githubTokenService';
import { toast } from '@/hooks/use-toast';
import { GithubApiService } from '@/services/github/githubApiService';

export const useGithubAuth = () => {
  const [authState, setAuthState] = useState<GitHubAuthState>({
    isAuthenticated: false,
    token: null,
    username: null,
    loading: true,
    error: null
  });

  const { user } = useAuth();

  useEffect(() => {
    const loadStoredToken = async () => {
      if (user) {
        try {
          const { token, username } = await GithubTokenService.loadToken(user.id);
          
          if (token) {
            setAuthState({
              isAuthenticated: true,
              token,
              username,
              loading: false,
              error: null
            });
          } else {
            setAuthState(prev => ({ ...prev, loading: false }));
          }
        } catch (err) {
          console.error('Failed to load GitHub token:', err);
          setAuthState(prev => ({ 
            ...prev, 
            loading: false,
            error: 'Failed to load GitHub credentials'
          }));
        }
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };
    
    loadStoredToken();
  }, [user]);

  const authenticate = async (token: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to connect to GitHub',
        variant: 'destructive',
      });
      return;
    }
    
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Validate the token by fetching user info
      const githubService = new GithubApiService({ token });
      const userData = await githubService.fetchUserInfo();
      
      if (userData && userData.login) {
        // Save token to Supabase
        await GithubTokenService.saveToken(user.id, token, userData.login);
        
        setAuthState({
          isAuthenticated: true,
          token,
          username: userData.login,
          loading: false,
          error: null
        });
        
        toast({
          title: 'Success',
          description: 'Successfully connected to GitHub!',
        });
      } else {
        throw new Error('Failed to retrieve user information');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setAuthState({
        isAuthenticated: false,
        token: null,
        username: null,
        loading: false,
        error: error.message || 'Authentication failed'
      });
      toast({
        title: 'Error',
        description: error.message || 'Authentication failed.',
        variant: 'destructive',
      });
    }
  };

  const logout = async () => {
    if (user) {
      await GithubTokenService.deleteToken(user.id);
    }
    
    setAuthState({
      isAuthenticated: false,
      token: null,
      username: null,
      loading: false,
      error: null
    });
    
    toast({
      title: 'Success',
      description: 'Disconnected from GitHub',
    });
  };

  return {
    authState,
    authenticate,
    logout
  };
};
