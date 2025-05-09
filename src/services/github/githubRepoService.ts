
import { GithubRequestService, GithubRequestServiceOptions } from './githubRequestService';
import { GitHubRepo, GitHubBranch, GitHubFile, GitHubCommit } from '@/types/github';

/**
 * Service that handles GitHub repository API operations
 */
export class GithubRepoService extends GithubRequestService {
  constructor(options: GithubRequestServiceOptions) {
    super(options);
  }

  /**
   * Fetch repositories for the authenticated user
   */
  async fetchRepositories(): Promise<GitHubRepo[]> {
    try {
      return await this.get<GitHubRepo[]>('/user/repos?sort=updated&per_page=100');
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw error;
    }
  }

  /**
   * Fetch branches for a repository
   */
  async fetchBranches(repoFullName: string): Promise<GitHubBranch[]> {
    try {
      return await this.get<GitHubBranch[]>(`/repos/${repoFullName}/branches`);
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }
  }

  /**
   * Fetch files in a repository at a specific branch
   */
  async fetchFiles(repoFullName: string, branchName: string, path: string = ''): Promise<GitHubFile[]> {
    try {
      const encodedPath = path ? encodeURIComponent(path) : '';
      return await this.get<GitHubFile[]>(
        `/repos/${repoFullName}/contents/${encodedPath}?ref=${branchName}`
      );
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  /**
   * Fetch commit history for a specific file
   */
  async fetchFileCommits(repoFullName: string, filePath: string, branch: string): Promise<GitHubCommit[]> {
    try {
      return await this.get<GitHubCommit[]>(
        `/repos/${repoFullName}/commits?path=${encodeURIComponent(filePath)}&sha=${branch}`
      );
    } catch (error) {
      console.error('Error fetching file commits:', error);
      throw error;
    }
  }

  /**
   * Create a new branch based on another branch
   */
  async createBranch(repoFullName: string, newBranchName: string, baseBranch: string): Promise<GitHubBranch> {
    try {
      // First get the SHA of the base branch
      const baseRef = await this.get<{ object: { sha: string } }>(
        `/repos/${repoFullName}/git/refs/heads/${baseBranch}`
      );
      
      // Create new branch reference
      const response = await this.post<GitHubBranch>(
        `/repos/${repoFullName}/git/refs`,
        {
          ref: `refs/heads/${newBranchName}`,
          sha: baseRef.object.sha
        }
      );
      
      return response;
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }
}
