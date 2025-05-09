
import { FileEntry } from './index';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: "file" | "dir";
  content?: string;
  encoding?: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  parents: {
    sha: string;
    url: string;
    html_url: string;
  }[];
}

export interface GitHubAuthState {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  loading: boolean;
  error: string | null;
}

// Updated to fix type errors with GitHubRepoSelector.tsx
export interface GitHubContextType {
  authState: GitHubAuthState;
  authenticate: (code: string) => Promise<void>;
  repositories: GitHubRepo[]; // Changed from repos
  branches: GitHubBranch[]; // Changed from branches
  availableBranches: GitHubBranch[]; // Added
  currentRepo: GitHubRepo | null;
  currentBranch: string | null;
  files: GitHubFile[];
  selectedFile: FileEntry | null;
  setSelectedFile: (file: FileEntry | null) => void;
  selectRepository: (repo: GitHubRepo) => Promise<void>; // Changed from selectRepo
  selectBranch: (branchName: string) => Promise<void>;
  fetchRepositories: () => Promise<GitHubRepo[]>; // Updated to match implementation
  fetchFileContent: (filePath: string) => Promise<string | null>;
  isLoading: boolean;
  saveFileToRepo: (filePath: string, content: string, commitMessage: string) => Promise<boolean>; // Updated to match implementation
  syncRepoToFileSystem: (owner: string, repo: string, branch: string) => Promise<void>; // Added
  logout: () => void;
}
