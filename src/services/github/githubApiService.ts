import { GitHubRepo, GitHubBranch, GitHubFile, GitHubCommit } from '@/types/github';
import { GithubUserService } from './githubUserService';
import { GithubRepoService } from './githubRepoService';
import { GithubContentService } from './githubContentService';
import { MemoryService } from '@/services/MemoryService';

export interface GithubApiServiceOptions {
  token: string | null;
  userId?: string;
}

/**
 * Main GitHub API service that combines all GitHub operations
 * This class serves as a facade for all the specific GitHub services
 */
export class GithubApiService {
  private userService: GithubUserService;
  private repoService: GithubRepoService;
  private contentService: GithubContentService;
  private token: string | null;
  private userId: string | undefined;

  constructor({ token, userId }: GithubApiServiceOptions) {
    this.token = token;
    this.userId = userId;
    this.userService = new GithubUserService({ token });
    this.repoService = new GithubRepoService({ token });
    this.contentService = new GithubContentService({ token });
  }

  /**
   * Fetch and store user information in memory
   */
  async fetchAndStoreUserInfo() {
    const userInfo = await this.userService.fetchUserInfo();
    
    // Store in memory if we have a userId
    if (this.userId) {
      await MemoryService.storeMemory(this.userId, 'github_user_profile', userInfo);
    }
    
    return userInfo;
  }

  /**
   * Fetch user information
   */
  async fetchUserInfo() {
    return this.userService.fetchUserInfo();
  }

  /**
   * Fetch user repositories
   */
  async fetchRepositories(): Promise<GitHubRepo[]> {
    const repos = await this.repoService.fetchRepositories();
    
    // Store in memory if we have a userId
    if (this.userId) {
      await MemoryService.storeMemory(
        this.userId, 
        'github_recent_repositories', 
        repos.slice(0, 5).map(r => r.full_name)
      );
    }
    
    return repos;
  }

  /**
   * Fetch branches for a repository
   */
  async fetchBranches(repoFullName: string): Promise<GitHubBranch[]> {
    return this.repoService.fetchBranches(repoFullName);
  }

  /**
   * Create a new branch
   */
  async createBranch(repoFullName: string, branchName: string, baseBranch: string): Promise<GitHubBranch> {
    return this.repoService.createBranch(repoFullName, branchName, baseBranch);
  }

  /**
   * Fetch files in a repository
   */
  async fetchFiles(repoFullName: string, branchName: string, path: string = ''): Promise<GitHubFile[]> {
    return this.repoService.fetchFiles(repoFullName, branchName, path);
  }

  /**
   * Fetch file content
   */
  async fetchFileContent(repoFullName: string, filePath: string, branchName: string): Promise<string | null> {
    const content = await this.contentService.fetchFileContent(repoFullName, filePath, branchName);
    
    // Store recently viewed files in memory
    if (content && this.userId) {
      const recentFiles = await MemoryService.retrieveMemory(this.userId, 'github_recent_files') || [];
      
      // Add to recent files if not already there
      const updatedFiles = [
        { path: filePath, repo: repoFullName, branch: branchName, timestamp: Date.now() },
        ...recentFiles.filter((f: any) => f.path !== filePath).slice(0, 9) // Keep last 10 files
      ];
      
      await MemoryService.storeMemory(this.userId, 'github_recent_files', updatedFiles);
    }
    
    return content;
  }

  /**
   * Fetch commit history for a file
   */
  async fetchFileCommits(repoFullName: string, filePath: string, branchName: string): Promise<GitHubCommit[]> {
    return this.repoService.fetchFileCommits(repoFullName, filePath, branchName);
  }

  /**
   * Save file to repo
   */
  async saveFileToRepo(
    repoFullName: string,
    filePath: string,
    content: string,
    commitMessage: string,
    branchName: string
  ): Promise<boolean> {
    const success = await this.contentService.saveFileToRepo(
      repoFullName, 
      filePath, 
      content, 
      commitMessage, 
      branchName
    );
    
    // Store commit history in memory
    if (success && this.userId) {
      const commitHistory = await MemoryService.retrieveMemory(this.userId, 'github_commit_history') || [];
      
      commitHistory.unshift({
        repo: repoFullName,
        branch: branchName,
        file: filePath,
        message: commitMessage,
        timestamp: Date.now()
      });
      
      // Keep only the last 50 commits
      await MemoryService.storeMemory(
        this.userId, 
        'github_commit_history', 
        commitHistory.slice(0, 50)
      );
    }
    
    return success;
  }

  /**
   * Fetch directory contents recursively
   */
  async fetchDirectoryContents(
    owner: string, 
    repo: string, 
    path: string, 
    branch: string
  ): Promise<{path: string, type: string, content?: string}[]> {
    return this.contentService.fetchDirectoryContents(owner, repo, path, branch);
  }
}
