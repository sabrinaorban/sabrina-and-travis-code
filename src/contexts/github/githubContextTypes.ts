
import { FileEntry } from '@/types';
import { GitHubAuthState, GitHubRepo, GitHubBranch, GitHubFile } from '@/types/github';

// Additional types specific to the GitHub context implementation
export interface GitHubMemoryData {
  recentRepositories?: string[];
  recentFiles?: Array<{
    path: string;
    repo: string;
    branch: string;
    timestamp: number;
  }>;
  commitHistory?: Array<{
    repo: string;
    branch: string;
    file: string;
    message: string;
    timestamp: number;
  }>;
  lastAccessed?: string;
  username?: string | null;
}

export interface RepoInfo {
  repoFullName: string;
  branchName: string;
}

// Define the GitHubContextType interface
export interface GitHubContextType {
  authState: GitHubAuthState;
  authenticate: (code: string) => Promise<void>;
  repositories: GitHubRepo[];
  branches: GitHubBranch[];
  availableBranches: GitHubBranch[];
  currentRepo: GitHubRepo | null;
  currentBranch: string | null;
  files: GitHubFile[];
  selectedFile: FileEntry | null;
  setSelectedFile: (file: FileEntry | null) => void;
  selectRepository: (repo: GitHubRepo) => Promise<void>;
  selectBranch: (branchName: string) => Promise<void>;
  fetchRepositories: () => Promise<GitHubRepo[]>;
  fetchFileContent: (filePath: string) => Promise<string | null>;
  isLoading: boolean;
  saveFileToRepo: (filePath: string, content: string, commitMessage: string) => Promise<boolean>; 
  syncRepoToFileSystem: (owner: string, repo: string, branch: string) => Promise<boolean>;
  logout: () => void;
  // Add new methods for memory management
  getLastSyncState: () => { isSuccessful: boolean; timestamp: number } | null;
  resetSyncState: () => void;
  isSyncing: boolean;
}
