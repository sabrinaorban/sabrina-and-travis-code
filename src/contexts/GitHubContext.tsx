
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GitHubRepo, GitHubBranch, GitHubFile, GitHubAuthState } from '../types/github';
import { githubService } from '../services/GitHubService';
import { useAuth } from './AuthContext';

interface GitHubContextType {
  authState: GitHubAuthState;
  repositories: GitHubRepo[];
  currentRepo: GitHubRepo | null;
  currentBranch: string | null;
  availableBranches: GitHubBranch[];
  isLoading: boolean;
  authenticate: (token: string) => Promise<boolean>;
  logout: () => void;
  fetchRepositories: () => Promise<void>;
  selectRepository: (repo: GitHubRepo) => Promise<void>;
  selectBranch: (branch: string) => Promise<void>;
  syncRepoToFileSystem: (owner: string, repo: string, branch: string) => Promise<void>;
  getRepoFileContent: (path: string) => Promise<string>;
  saveFileToRepo: (path: string, content: string, commitMessage: string) => Promise<boolean>;
}

const GitHubContext = createContext<GitHubContextType | null>(null);

export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [authState, setAuthState] = useState<GitHubAuthState>({
    isAuthenticated: false,
    token: null,
    username: null,
    loading: false,
    error: null
  });
  
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [currentRepo, setCurrentRepo] = useState<GitHubRepo | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [availableBranches, setAvailableBranches] = useState<GitHubBranch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load stored token from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      const loadStoredToken = async () => {
        setAuthState(prev => ({ ...prev, loading: true }));
        try {
          const token = await githubService.getTokenFromSupabase(user.id);
          
          if (token) {
            // Verify token and authenticate
            githubService.setToken(token);
            try {
              const userInfo = await githubService.verifyToken();
              
              setAuthState({
                isAuthenticated: true,
                token,
                username: userInfo.login,
                loading: false,
                error: null
              });
              
              githubService.setUsername(userInfo.login);
              
              // Load repositories
              await fetchRepositories();
            } catch (error) {
              console.error('Invalid stored token:', error);
              setAuthState({
                isAuthenticated: false,
                token: null,
                username: null,
                loading: false,
                error: 'Stored token is invalid'
              });
            }
          } else {
            setAuthState(prev => ({ ...prev, loading: false }));
          }
        } catch (error) {
          console.error('Error loading stored token:', error);
          setAuthState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Failed to load stored authentication' 
          }));
        }
      };
      
      loadStoredToken();
    }
  }, [user]);

  // Authenticate with GitHub
  const authenticate = async (token: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      githubService.setToken(token);
      const userInfo = await githubService.verifyToken();
      
      setAuthState({
        isAuthenticated: true,
        token,
        username: userInfo.login,
        loading: false,
        error: null
      });
      
      githubService.setUsername(userInfo.login);
      
      // Store token in Supabase if user is logged in
      if (user) {
        await githubService.storeTokenInSupabase(user.id, token);
      }
      
      // Load repositories
      await fetchRepositories();
      
      toast({
        title: "GitHub Connected",
        description: `Successfully connected to GitHub as ${userInfo.login}`,
      });
      
      return true;
    } catch (error: any) {
      console.error('GitHub authentication failed:', error);
      
      setAuthState({
        isAuthenticated: false,
        token: null,
        username: null,
        loading: false,
        error: error.message || 'Authentication failed'
      });
      
      toast({
        title: "Authentication Failed",
        description: error.message || "Could not authenticate with GitHub",
        variant: "destructive"
      });
      
      return false;
    }
  };

  // Logout from GitHub
  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      token: null,
      username: null,
      loading: false,
      error: null
    });
    
    setRepositories([]);
    setCurrentRepo(null);
    setCurrentBranch(null);
    setAvailableBranches([]);
    
    toast({
      title: "Disconnected",
      description: "Successfully disconnected from GitHub",
    });
  };

  // Fetch repositories
  const fetchRepositories = async (): Promise<void> => {
    if (!authState.isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const repos = await githubService.getRepositories();
      setRepositories(repos);
    } catch (error: any) {
      console.error('Error fetching repositories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch repositories",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Select a repository
  const selectRepository = async (repo: GitHubRepo): Promise<void> => {
    setIsLoading(true);
    try {
      setCurrentRepo(repo);
      
      // Fetch branches
      const [owner, repoName] = repo.full_name.split('/');
      const branches = await githubService.getBranches(owner, repoName);
      setAvailableBranches(branches);
      
      // Default to the default branch
      setCurrentBranch(repo.default_branch);
      
      toast({
        title: "Repository Selected",
        description: `Now working with ${repo.full_name}`,
      });
    } catch (error: any) {
      console.error('Error selecting repository:', error);
      toast({
        title: "Error",
        description: "Failed to load repository details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Select a branch
  const selectBranch = async (branch: string): Promise<void> => {
    setCurrentBranch(branch);
    
    toast({
      title: "Branch Selected",
      description: `Switched to branch ${branch}`,
    });
  };

  // Import files from GitHub to the virtual file system
  const syncRepoToFileSystem = async (owner: string, repo: string, branch: string): Promise<void> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to sync files",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await importGitHubDirectory(owner, repo, '', branch);
      
      toast({
        title: "Sync Complete",
        description: "Repository files have been synced to your workspace",
      });
    } catch (error: any) {
      console.error('Error syncing repository:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync repository files",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Recursive function to import a directory from GitHub
  const importGitHubDirectory = async (
    owner: string, 
    repo: string, 
    path: string = '', 
    branch: string
  ): Promise<void> => {
    if (!user) return;
    
    try {
      const contents = await githubService.getContents(owner, repo, path, branch);
      
      // Handle array of files/directories
      if (Array.isArray(contents)) {
        for (const item of contents) {
          if (item.type === 'file') {
            // Get file content and create in virtual file system
            const content = await githubService.getFileContent(owner, repo, item.path, branch);
            await createFileInSystem(item.path, content);
          } else if (item.type === 'dir') {
            // Create the directory and process its contents recursively
            await createFolderInSystem(item.path);
            await importGitHubDirectory(owner, repo, item.path, branch);
          }
        }
      }
      // Handle single file
      else if (contents.type === 'file') {
        const content = await githubService.getFileContent(owner, repo, path, branch);
        await createFileInSystem(path, content);
      }
    } catch (error) {
      console.error(`Error importing path ${path}:`, error);
      throw error;
    }
  };

  // Create a file in the virtual file system
  const createFileInSystem = async (path: string, content: string): Promise<void> => {
    if (!user) return;
    
    try {
      // Extract directory path and filename
      const lastSlashIndex = path.lastIndexOf('/');
      const dirPath = lastSlashIndex > 0 ? `/${path.substring(0, lastSlashIndex)}` : '/';
      const fileName = path.substring(lastSlashIndex + 1);
      
      // Create file in Supabase with GitHub metadata
      const { error } = await supabase.from('files')
        .upsert({
          name: fileName,
          path: `/${path}`,
          type: 'file',
          content: content,
          user_id: user.id,
          last_modified: new Date().toISOString(),
          github_path: path,
          github_repo: currentRepo?.full_name || null,
          github_branch: currentBranch || null
        });
        
      if (error) throw error;
    } catch (error) {
      console.error(`Error creating file ${path}:`, error);
      throw error;
    }
  };

  // Create a folder in the virtual file system
  const createFolderInSystem = async (path: string): Promise<void> => {
    if (!user) return;
    
    try {
      // Extract parent directory path and folder name
      const lastSlashIndex = path.lastIndexOf('/');
      const dirPath = lastSlashIndex > 0 ? `/${path.substring(0, lastSlashIndex)}` : '/';
      const folderName = path.substring(lastSlashIndex + 1);
      
      // Create folder in Supabase with GitHub metadata
      const { error } = await supabase.from('files')
        .upsert({
          name: folderName,
          path: `/${path}`,
          type: 'folder',
          content: null,
          user_id: user.id,
          last_modified: new Date().toISOString(),
          github_path: path,
          github_repo: currentRepo?.full_name || null,
          github_branch: currentBranch || null
        });
        
      if (error) throw error;
    } catch (error) {
      console.error(`Error creating folder ${path}:`, error);
      throw error;
    }
  };

  // Get content of a file from GitHub
  const getRepoFileContent = async (path: string): Promise<string> => {
    if (!currentRepo || !currentBranch) {
      throw new Error('No repository or branch selected');
    }
    
    const [owner, repo] = currentRepo.full_name.split('/');
    
    try {
      return await githubService.getFileContent(owner, repo, path, currentBranch);
    } catch (error) {
      console.error(`Error getting file content for ${path}:`, error);
      throw error;
    }
  };

  // Save file changes back to GitHub
  const saveFileToRepo = async (path: string, content: string, commitMessage: string): Promise<boolean> => {
    if (!currentRepo || !currentBranch || !authState.isAuthenticated) {
      toast({
        title: "Error",
        description: "No repository selected or not authenticated",
        variant: "destructive"
      });
      return false;
    }
    
    const [owner, repo] = currentRepo.full_name.split('/');
    
    setIsLoading(true);
    try {
      // Get the current file to get its SHA
      let sha: string | undefined;
      try {
        const fileInfo = await githubService.getContents(owner, repo, path, currentBranch) as GitHubFile;
        sha = fileInfo.sha;
      } catch (error) {
        // File might not exist yet, which is fine for creation
        console.log('File does not exist yet, will create it:', path);
      }
      
      // Create or update the file
      await githubService.createOrUpdateFile(
        owner,
        repo,
        path,
        content,
        commitMessage,
        currentBranch,
        sha
      );
      
      toast({
        title: "Changes Pushed",
        description: `Successfully pushed changes to ${currentRepo.full_name}`,
      });
      
      return true;
    } catch (error: any) {
      console.error('Error saving file to GitHub:', error);
      toast({
        title: "Push Failed",
        description: error.message || "Failed to push changes to GitHub",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GitHubContext.Provider value={{
      authState,
      repositories,
      currentRepo,
      currentBranch,
      availableBranches,
      isLoading,
      authenticate,
      logout,
      fetchRepositories,
      selectRepository,
      selectBranch,
      syncRepoToFileSystem,
      getRepoFileContent,
      saveFileToRepo
    }}>
      {children}
    </GitHubContext.Provider>
  );
};

export const useGitHub = () => {
  const context = useContext(GitHubContext);
  if (context === null) {
    throw new Error('useGitHub must be used within a GitHubProvider');
  }
  return context;
};
