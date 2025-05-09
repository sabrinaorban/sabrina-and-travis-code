
import { GitHubRepo, GitHubBranch, GitHubFile } from '@/types/github';
import { GithubApiService } from './githubApiService';
import { useToast } from '@/hooks/use-toast';

export class GithubRepositoryService {
  private apiService: GithubApiService;
  private toast: ReturnType<typeof useToast>['toast'];

  constructor(apiService: GithubApiService, toast: ReturnType<typeof useToast>['toast']) {
    this.apiService = apiService;
    this.toast = toast;
  }

  async fetchRepositories(): Promise<GitHubRepo[]> {
    try {
      return await this.apiService.fetchRepositories();
    } catch (error: any) {
      console.error('Error fetching repositories:', error);
      this.toast({
        title: 'Error',
        description: `Failed to fetch repositories: ${error.message}`,
        variant: 'destructive',
      });
      return [];
    }
  }

  async fetchBranches(repoFullName: string): Promise<GitHubBranch[]> {
    try {
      return await this.apiService.fetchBranches(repoFullName);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      this.toast({
        title: 'Error',
        description: `Failed to fetch branches: ${error.message}`,
        variant: 'destructive',
      });
      return [];
    }
  }

  async fetchFiles(repoFullName: string, branchName: string): Promise<GitHubFile[]> {
    try {
      return await this.apiService.fetchFiles(repoFullName, branchName);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      this.toast({
        title: 'Error',
        description: `Failed to fetch files: ${error.message}`,
        variant: 'destructive',
      });
      return [];
    }
  }

  async fetchFileContent(repoFullName: string, filePath: string, branchName: string): Promise<string | null> {
    try {
      return await this.apiService.fetchFileContent(repoFullName, filePath, branchName);
    } catch (error: any) {
      console.error('Error fetching file content:', error);
      this.toast({
        title: 'Error',
        description: `Failed to fetch file content: ${error.message}`,
        variant: 'destructive',
      });
      return null;
    }
  }

  async saveFileToRepo(
    repoFullName: string,
    filePath: string,
    content: string,
    commitMessage: string,
    branchName: string
  ): Promise<boolean> {
    try {
      return await this.apiService.saveFileToRepo(repoFullName, filePath, content, commitMessage, branchName);
    } catch (error: any) {
      console.error('Error saving file:', error);
      this.toast({
        title: 'Error',
        description: `Failed to save file: ${error.message}`,
        variant: 'destructive',
      });
      return false;
    }
  }
}
