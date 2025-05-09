
import { GithubRequestService, GithubRequestServiceOptions } from './githubRequestService';
import { GitHubFile } from '@/types/github';

/**
 * Service that handles GitHub content-related API operations
 */
export class GithubContentService extends GithubRequestService {
  constructor(options: GithubRequestServiceOptions) {
    super(options);
  }

  /**
   * Fetch the content of a file from GitHub
   */
  async fetchFileContent(repoFullName: string, filePath: string, branchName: string): Promise<string | null> {
    try {
      const response = await this.get<GitHubFile>(
        `/repos/${repoFullName}/contents/${filePath}?ref=${branchName}`
      );
      
      if (response.content && response.encoding === 'base64') {
        return atob(response.content.replace(/\n/g, ''));
      }
      return null;
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  }

  /**
   * Save a file to GitHub repository
   */
  async saveFileToRepo(
    repoFullName: string,
    filePath: string,
    content: string,
    commitMessage: string,
    branchName: string
  ): Promise<boolean> {
    try {
      // Get the SHA of the latest commit for the file
      let sha = '';
      try {
        const fileData = await this.get<GitHubFile>(
          `/repos/${repoFullName}/contents/${filePath}?ref=${branchName}`
        );
        sha = fileData.sha;
      } catch (error) {
        // File may not exist yet, which is fine for creating a new file
        console.log('File may not exist yet, proceeding with creation');
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
      await this.put(
        `/repos/${repoFullName}/contents/${filePath}`,
        commitData
      );

      return true;
    } catch (error) {
      console.error('Error saving file to repo:', error);
      throw error;
    }
  }

  /**
   * Fetch contents of a directory in a repository
   */
  async fetchDirectoryContents(
    owner: string, 
    repo: string, 
    path: string, 
    branch: string
  ): Promise<{path: string, type: string, content?: string}[]> {
    const results: {path: string, type: string, content?: string}[] = [];
    
    try {
      const items = await this.get<GitHubFile | GitHubFile[]>(
        `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
      );
      
      // Process each item in the directory
      for (const item of Array.isArray(items) ? items : [items]) {
        // Always add the item itself (file or folder)
        if (item.type === 'file') {
          // Fetch file content for all files
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
              const fileData = await this.get<GitHubFile>(
                `/repos/${owner}/${repo}/contents/${item.path}?ref=${branch}`
              );
              
              if (fileData.content && fileData.encoding === 'base64') {
                content = atob(fileData.content.replace(/\n/g, ''));
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
