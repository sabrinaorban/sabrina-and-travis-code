
import { FileEntry } from '@/types';
import { GitHubAuthState, GitHubContextType, GitHubRepo, GitHubBranch, GitHubFile } from '@/types/github';

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

// Use export type to re-export types
export type { GitHubAuthState, GitHubContextType, GitHubRepo, GitHubBranch, GitHubFile };
