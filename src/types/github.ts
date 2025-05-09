
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
