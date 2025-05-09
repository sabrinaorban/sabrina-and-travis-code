
import { GitHubRepo, GitHubBranch, GitHubFile, GitHubCommit } from '../types/github';
import { supabase } from '../lib/supabase';

// Base GitHub API URL
const GITHUB_API_URL = 'https://api.github.com';

export class GitHubService {
  private token: string | null = null;
  private username: string | null = null;

  constructor(token?: string) {
    if (token) {
      this.token = token;
    }
  }

  setToken(token: string) {
    this.token = token;
  }

  setUsername(username: string) {
    this.username = username;
  }

  // Headers for GitHub API requests
  private getHeaders() {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    
    return headers;
  }

  // Generic fetch method for GitHub API
  private async fetchFromGitHub<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`GitHub API Error: ${response.status} - ${error.message || response.statusText}`);
    }
    
    return await response.json();
  }

  // Verify GitHub token and get user info
  async verifyToken(): Promise<{ login: string }> {
    return this.fetchFromGitHub<{ login: string }>('/user');
  }

  // Get user's repositories
  async getRepositories(): Promise<GitHubRepo[]> {
    return this.fetchFromGitHub<GitHubRepo[]>('/user/repos?sort=updated&per_page=100');
  }

  // Get repository branches
  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    return this.fetchFromGitHub<GitHubBranch[]>(`/repos/${owner}/${repo}/branches`);
  }

  // Get repository contents (files and folders)
  async getContents(owner: string, repo: string, path: string = '', ref?: string): Promise<GitHubFile | GitHubFile[]> {
    let endpoint = `/repos/${owner}/${repo}/contents/${path}`;
    if (ref) {
      endpoint += `?ref=${ref}`;
    }
    return this.fetchFromGitHub<GitHubFile | GitHubFile[]>(endpoint);
  }

  // Get file content
  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const file = await this.getContents(owner, repo, path, ref) as GitHubFile;
    
    if (file.type !== 'file' || !file.content) {
      throw new Error('Not a file or no content available');
    }
    
    // GitHub API returns content as base64
    return atob(file.content.replace(/\n/g, ''));
  }

  // Create or update file
  async createOrUpdateFile(
    owner: string, 
    repo: string, 
    path: string, 
    content: string, 
    message: string, 
    branch: string,
    sha?: string
  ): Promise<{ commit: GitHubCommit; content: GitHubFile }> {
    // Convert content to base64
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    
    const body: Record<string, any> = {
      message,
      content: base64Content,
      branch
    };
    
    // If sha is provided, it's an update operation
    if (sha) {
      body.sha = sha;
    }
    
    return this.fetchFromGitHub<{ commit: GitHubCommit; content: GitHubFile }>(
      `/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    );
  }

  // Store GitHub token in Supabase
  async storeTokenInSupabase(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('github_tokens')
        .upsert(
          { user_id: userId, token, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
        
      if (error) throw error;
    } catch (error) {
      console.error('Error storing GitHub token:', error);
      throw error;
    }
  }

  // Retrieve GitHub token from Supabase
  async getTokenFromSupabase(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('github_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();
        
      if (error) throw error;
      
      return data?.token || null;
    } catch (error) {
      console.error('Error retrieving GitHub token:', error);
      return null;
    }
  }
}

// Create and export a default instance
export const githubService = new GitHubService();
