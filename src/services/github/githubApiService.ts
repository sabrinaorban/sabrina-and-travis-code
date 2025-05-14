import { GitHubRepo, GitHubBranch, GitHubFile, GitHubCommit } from '@/types/github';
import { GithubUserService } from './githubUserService';
import { GithubRepoService } from './githubRepoService';
import { GithubContentService } from './githubContentService';
import { MemoryService } from '@/services/MemoryService';

export interface GithubApiServiceOptions {
  token: string | null;
  userId?: string;
}

// Simple in-memory cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache TTL
const REQUEST_THROTTLE = new Map<string, number>();
const THROTTLE_DELAY = 2000; // 2 second throttle delay

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

  // Helper to check if a request should be throttled
  private shouldThrottle(key: string): boolean {
    const now = Date.now();
    const lastRequest = REQUEST_THROTTLE.get(key);
    
    if (lastRequest && now - lastRequest < THROTTLE_DELAY) {
      return true;
    }
    
    REQUEST_THROTTLE.set(key, now);
    return false;
  }

  // Helper to get cached data or execute API call
  private async withCache<T>(cacheKey: string, fetchFn: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached.data as T;
    }
    
    // Check throttling
    if (this.shouldThrottle(cacheKey)) {
      console.log(`Request throttled for ${cacheKey}`);
      // If throttled and we have stale cache data, return it
      if (cached) {
        return cached.data as T;
      }
    }
    
    // Execute fetch function
    try {
      const data = await fetchFn();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      // If fetch fails and we have stale cache, return it with a warning
      if (cached) {
        console.warn(`Using stale cache for ${cacheKey} due to error:`, error);
        return cached.data as T;
      }
      throw error;
    }
  }

  /**
   * Fetch and store user information in memory
   */
  async fetchAndStoreUserInfo() {
    return this.withCache('user_info', async () => {
      const userInfo = await this.userService.fetchUserInfo();
      
      // Store in memory if we have a userId
      if (this.userId) {
        await MemoryService.storeMemory(this.userId, 'github_user_profile', userInfo);
      }
      
      return userInfo;
    });
  }

  /**
   * Fetch user information
   */
  async fetchUserInfo() {
    return this.withCache('user_info', () => this.userService.fetchUserInfo());
  }

  /**
   * Fetch user repositories
   */
  async fetchRepositories(): Promise<GitHubRepo[]> {
    return this.withCache('repositories', async () => {
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
    });
  }

  /**
   * Fetch branches for a repository
   */
  async fetchBranches(repoFullName: string): Promise<GitHubBranch[]> {
    return this.withCache(`branches_${repoFullName}`, () => 
      this.repoService.fetchBranches(repoFullName)
    );
  }

  /**
   * Create a new branch
   */
  async createBranch(repoFullName: string, branchName: string, baseBranch: string): Promise<GitHubBranch> {
    // Don't cache branch creation - it's a write operation
    const result = await this.repoService.createBranch(repoFullName, branchName, baseBranch);
    
    // Invalidate branches cache for this repo
    cache.delete(`branches_${repoFullName}`);
    
    return result;
  }

  /**
   * Fetch files in a repository
   */
  async fetchFiles(repoFullName: string, branchName: string, path: string = ''): Promise<GitHubFile[]> {
    return this.withCache(`files_${repoFullName}_${branchName}_${path}`, () => 
      this.repoService.fetchFiles(repoFullName, branchName, path)
    );
  }

  /**
   * Fetch file content
   */
  async fetchFileContent(repoFullName: string, filePath: string, branchName: string): Promise<string | null> {
    return this.withCache(`content_${repoFullName}_${branchName}_${filePath}`, async () => {
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
    });
  }

  /**
   * Fetch commit history for a file
   */
  async fetchFileCommits(repoFullName: string, filePath: string, branchName: string): Promise<GitHubCommit[]> {
    return this.withCache(`commits_${repoFullName}_${branchName}_${filePath}`, () => 
      this.repoService.fetchFileCommits(repoFullName, filePath, branchName)
    );
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
    // Don't cache save operations - they're write operations
    const success = await this.contentService.saveFileToRepo(
      repoFullName, 
      filePath, 
      content, 
      commitMessage, 
      branchName
    );
    
    // Invalidate relevant caches on success
    if (success) {
      cache.delete(`content_${repoFullName}_${branchName}_${filePath}`);
      cache.delete(`files_${repoFullName}_${branchName}_${filePath.split('/').slice(0, -1).join('/')}`);
      
      // Store commit history in memory
      if (this.userId) {
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
    return this.withCache(`directory_${owner}_${repo}_${branch}_${path}`, () => 
      this.contentService.fetchDirectoryContents(owner, repo, path, branch)
    );
  }
  
  /**
   * Clear cache entries for a specific repository or all entries
   */
  clearCache(repoFullName?: string): void {
    if (!repoFullName) {
      cache.clear();
      return;
    }
    
    // Clear specific repo entries
    for (const key of cache.keys()) {
      if (key.includes(repoFullName)) {
        cache.delete(key);
      }
    }
  }
}
