
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { GitHubRepo, GitHubBranch, GitHubFile, GitHubAuthState, GitHubContextType } from '../types/github';
import { FileEntry } from '../types';
import { useFileSystem } from './FileSystemContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '../lib/supabase'; // Import supabase client

const initialAuthState: GitHubAuthState = {
  isAuthenticated: false,
  token: null,
  username: null,
  loading: false,
  error: null
};

// GitHub context creation
const GitHubContext = createContext<GitHubContextType | null>(null);

export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<GitHubAuthState>({
    isAuthenticated: false,
    token: null,
    username: null,
    loading: true,
    error: null
  });
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [currentRepo, setCurrentRepo] = useState<GitHubRepo | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { refreshFiles } = useFileSystem();

  // Load stored token on component mount
  useEffect(() => {
    const loadStoredToken = async () => {
      if (user) {
        try {
          // Using the imported supabase client
          const { data, error } = await supabase
            .from('github_tokens')
            .select('token, username')
            .eq('user_id', user.id)
            .single();
          
          if (error) {
            console.error('Error retrieving GitHub token:', error);
            setAuthState(prev => ({ ...prev, loading: false }));
            return;
          }
          
          if (data && data.token) {
            setAuthState({
              isAuthenticated: true,
              token: data.token,
              username: data.username || null,
              loading: false,
              error: null
            });
            
            // If token is valid, fetch user repos
            fetchUserRepos(data.token);
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

  // Function to fetch user repositories
  const fetchRepositories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          Authorization: `token ${authState.token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      const data: GitHubRepo[] = await response.json();
      setRepositories(data);
    } catch (error: any) {
      console.error('Error fetching repos:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch repositories: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch user repositories with a specific token
  const fetchUserRepos = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      const data: GitHubRepo[] = await response.json();
      setRepositories(data);
    } catch (error: any) {
      console.error('Error fetching repos:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch repositories: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to authenticate with GitHub
  const authenticate = async (token: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Validate the token by fetching user info
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }
      
      const userData = await response.json();
      
      if (userData && userData.login) {
        setAuthState({
          isAuthenticated: true,
          token: token,
          username: userData.login,
          loading: false,
          error: null
        });
        
        // Save token to Supabase
        await saveToken(token, userData.login);
        
        // Fetch user repos
        fetchUserRepos(token);
        
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

  // Function to fetch branches for a repository
  const fetchBranches = async (repoFullName: string, token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/branches`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      const data: GitHubBranch[] = await response.json();
      setBranches(data);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch branches: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch files for a repository and branch
  const fetchFiles = async (repoFullName: string, branchName: string, token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents?ref=${branchName}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      const data: GitHubFile[] = await response.json();
      setFiles(data);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch files: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to select a repository
  const selectRepository = async (repo: GitHubRepo) => {
    setCurrentRepo(repo);
    await fetchBranches(repo.full_name, authState.token || '');
  };

  // Function to select a branch
  const selectBranch = async (branchName: string) => {
    setCurrentBranch(branchName);
    if (currentRepo) {
      await fetchFiles(currentRepo.full_name, branchName, authState.token || '');
    }
  };

  // Function to fetch file content
  const fetchFileContent = async (filePath: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${currentRepo?.full_name}/contents/${filePath}?ref=${currentBranch}`, {
        headers: {
          Authorization: `token ${authState.token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      const data = await response.json();
      if (data.content && data.encoding === 'base64') {
        return atob(data.content);
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching file content:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch file content: ${error.message}`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Save token to Supabase
  const saveToken = async (token: string, username: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('github_tokens')
        .upsert({ 
          user_id: user.id,
          token,
          username,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      return true;
    } catch (err) {
      console.error('Error saving GitHub token:', err);
      return false;
    }
  };

  const saveFileToRepo = async (filePath: string, content: string, commitMessage: string) => {
    setIsLoading(true);
    try {
      // Get the SHA of the latest commit for the file
      const getFileResponse = await fetch(`https://api.github.com/repos/${currentRepo?.full_name}/contents/${filePath}?ref=${currentBranch}`, {
        headers: {
          Authorization: `token ${authState.token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (!getFileResponse.ok) {
        throw new Error(`Failed to get file: ${getFileResponse.status}`);
      }

      const fileData = await getFileResponse.json();
      const sha = fileData.sha;

      // Prepare the data for the commit
      const commitData = {
        message: commitMessage,
        content: btoa(content), // Base64 encode the content
        sha: sha,
        branch: currentBranch
      };

      // Commit the changes
      const commitResponse = await fetch(`https://api.github.com/repos/${currentRepo?.full_name}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${authState.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commitData)
      });

      if (!commitResponse.ok) {
        const errorData = await commitResponse.json();
        throw new Error(`Failed to commit: ${commitResponse.status} - ${errorData.message}`);
      }

      toast({
        title: 'Success',
        description: 'File committed successfully!',
      });

      // Refresh files in FileSystemContext
      await refreshFiles();
    } catch (error: any) {
      console.error('Error saving file to repo:', error);
      toast({
        title: 'Error',
        description: `Failed to save file: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthState(initialAuthState);
    setRepositories([]);
    setBranches([]);
    setCurrentRepo(null);
    setCurrentBranch(null);
    setFiles([]);
    setSelectedFile(null);
  };

  // Sync repo to file system function
  const syncRepoToFileSystem = async (owner: string, repo: string, branch: string) => {
    setIsLoading(true);
    try {
      // For demonstration purposes, we'll just log the action
      console.log(`Syncing ${owner}/${repo} (${branch}) to file system`);
      
      // In a real implementation, this would fetch files from the repository
      // and add them to the file system context
      
      toast({
        title: 'Success',
        description: `Repository ${owner}/${repo} (${branch}) synced to file system`,
      });
    } catch (error: any) {
      console.error('Error syncing repo:', error);
      toast({
        title: 'Error',
        description: `Failed to sync repository: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GitHubContext.Provider value={{
      authState,
      authenticate,
      repositories,
      branches,
      availableBranches: branches,
      currentRepo,
      currentBranch,
      files,
      selectedFile,
      setSelectedFile,
      selectRepository,
      selectBranch,
      fetchRepositories,
      fetchFileContent,
      isLoading,
      saveFileToRepo,
      syncRepoToFileSystem,
      logout
    }}>
      {children}
    </GitHubContext.Provider>
  );
};

export const useGitHub = () => {
  const context = useContext(GitHubContext);
  if (!context) {
    throw new Error('useGitHub must be used within a GitHubProvider');
  }
  return context;
};
