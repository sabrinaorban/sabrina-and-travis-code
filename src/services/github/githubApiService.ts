
import { GitHubRepo, GitHubBranch, GitHubFile } from '@/types/github';
import { GithubUserService } from './githubUserService';
import { GithubRepoService } from './githubRepoService';
import { GithubContentService } from './githubContentService';

export interface GithubApiServiceOptions {
  token: string | null;
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

  constructor({ token }: GithubApiServiceOptions) {
    this.token = token;
    this.userService = new GithubUserService({ token });
    this.repoService = new GithubRepoService({ token });
    this.contentService = new GithubContentService({ token });
  }

  async fetchUserInfo() {
    return this.userService.fetchUserInfo();
  }

  async fetchRepositories(): Promise<GitHubRepo[]> {
    return this.repoService.fetchRepositories();
  }

  async fetchBranches(repoFullName: string): Promise<GitHubBranch[]> {
    return this.repoService.fetchBranches(repoFullName);
  }

  async fetchFiles(repoFullName: string, branchName: string): Promise<GitHubFile[]> {
    return this.repoService.fetchFiles(repoFullName, branchName);
  }

  async fetchFileContent(repoFullName: string, filePath: string, branchName: string): Promise<string | null> {
    return this.contentService.fetchFileContent(repoFullName, filePath, branchName);
  }

  async saveFileToRepo(
    repoFullName: string,
    filePath: string,
    content: string,
    commitMessage: string,
    branchName: string
  ): Promise<boolean> {
    return this.contentService.saveFileToRepo(repoFullName, filePath, content, commitMessage, branchName);
  }

  async fetchDirectoryContents(
    owner: string, 
    repo: string, 
    path: string, 
    branch: string
  ): Promise<{path: string, type: string, content?: string}[]> {
    return this.contentService.fetchDirectoryContents(owner, repo, path, branch);
  }
}
