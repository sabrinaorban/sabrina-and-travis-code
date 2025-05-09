
import { GitHubRepo, GitHubBranch, GitHubFile } from '../../types/github';
import { toast } from '@/hooks/use-toast';

export interface GithubApiServiceOptions {
  token: string | null;
}

export class GithubApiService {
  private token: string | null;

  constructor({ token }: GithubApiServiceOptions) {
    this.token = token;
  }

  private getHeaders() {
    return {
      Authorization: this.token ? `token ${this.token}` : '',
      Accept: 'application/vnd.github.v3+json'
    };
  }

  async fetchUserInfo() {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  async fetchRepositories(): Promise<GitHubRepo[]> {
    try {
      const response = await fetch('https://api.github.com/user/repos', {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching repositories:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch repositories: ${error.message}`,
        variant: 'destructive',
      });
      return [];
    }
  }

  async fetchBranches(repoFullName: string): Promise<GitHubBranch[]> {
    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/branches`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch branches: ${error.message}`,
        variant: 'destructive',
      });
      return [];
    }
  }

  async fetchFiles(repoFullName: string, branchName: string): Promise<GitHubFile[]> {
    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents?ref=${branchName}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch files: ${error.message}`,
        variant: 'destructive',
      });
      return [];
    }
  }

  async fetchFileContent(repoFullName: string, filePath: string, branchName: string): Promise<string | null> {
    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${branchName}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.content && data.encoding === 'base64') {
        return atob(data.content.replace(/\n/g, ''));
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching file content:', error);
      toast({
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
      // Get the SHA of the latest commit for the file
      const getFileResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${branchName}`, {
        headers: this.getHeaders()
      });

      let sha = '';
      if (getFileResponse.ok) {
        const fileData = await getFileResponse.json();
        sha = fileData.sha;
      }

      // Prepare the data for the commit
      const commitData: any = {
        message: commitMessage,
        content: btoa(content), // Base64 encode the content
        branch: branchName
      };
      
      if (sha) {
        commitData.sha = sha;
      }

      // Commit the changes
      const commitResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commitData)
      });

      if (!commitResponse.ok) {
        const errorData = await commitResponse.json();
        throw new Error(`Failed to commit: ${commitResponse.status} - ${errorData.message}`);
      }

      return true;
    } catch (error: any) {
      console.error('Error saving file to repo:', error);
      toast({
        title: 'Error',
        description: `Failed to save file: ${error.message}`,
        variant: 'destructive',
      });
      return false;
    }
  }

  async fetchDirectoryContents(
    owner: string, 
    repo: string, 
    path: string, 
    branch: string
  ): Promise<{path: string, type: string, content?: string}[]> {
    const results: {path: string, type: string, content?: string}[] = [];
    
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      
      const items = await response.json();
      
      // Process each item in the directory
      for (const item of Array.isArray(items) ? items : [items]) {
        // Always add the item itself (file or folder)
        if (item.type === 'file') {
          // Fetch file content for all files, not just the ones with download_url
          let content = '';
          try {
            // Try first with download_url if available
            if (item.download_url) {
              const contentResponse = await fetch(item.download_url);
              if (contentResponse.ok) {
                content = await contentResponse.text();
              } else {
                console.warn(`Failed to fetch content for ${item.path}: ${contentResponse.status}`);
              }
            } 
            
            // If download_url wasn't available or failed, try getting content from base64
            if (!content && item.content && item.encoding === 'base64') {
              content = atob(item.content.replace(/\n/g, ''));
            }
            
            // If we still don't have content, fetch it directly
            if (!content) {
              const fileContentResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${branch}`, {
                headers: this.getHeaders()
              });
              
              if (fileContentResponse.ok) {
                const fileData = await fileContentResponse.json();
                if (fileData.content && fileData.encoding === 'base64') {
                  content = atob(fileData.content.replace(/\n/g, ''));
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching content for ${item.path}:`, error);
            // Continue even if we couldn't get content for this file
          }
          
          results.push({
            path: item.path,
            type: 'file',
            content
          });
        } else if (item.type === 'dir') {
          // Add the directory itself
          results.push({
            path: item.path,
            type: 'folder'
          });
          
          // Recursively fetch contents of subdirectory
          const subItems = await this.fetchDirectoryContents(owner, repo, item.path, branch);
          results.push(...subItems);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching directory contents:', error);
      throw error;
    }
  }
}
