
import { GithubRequestService, GithubRequestServiceOptions } from './githubRequestService';
import { GitHubRepo, GitHubBranch, GitHubFile } from '@/types/github';

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
      return await this.get<GitHubRepo[]>('/user/repos');
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
  async fetchFiles(repoFullName: string, branchName: string): Promise<GitHubFile[]> {
    try {
      return await this.get<GitHubFile[]>(`/repos/${repoFullName}/contents?ref=${branchName}`);
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }
}
