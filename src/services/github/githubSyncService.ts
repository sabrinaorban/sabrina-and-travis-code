
import { useToast } from '@/hooks/use-toast';
import { GithubApiService } from './githubApiService';

export class GithubSyncService {
  private apiService: GithubApiService;
  private toast: ReturnType<typeof useToast>['toast']; 
  private syncInProgress: boolean = false;
  private syncedFiles: number = 0;
  private syncedFolders: number = 0;
  private failedItems: string[] = [];

  constructor(apiService: GithubApiService, toast: ReturnType<typeof useToast>['toast']) {
    this.apiService = apiService;
    this.toast = toast;
  }

  async syncRepoToFileSystem(
    owner: string,
    repo: string,
    branch: string,
    createFile: (path: string, name: string, content: string) => Promise<void>,
    createFolder: (path: string, name: string) => Promise<void>
  ): Promise<boolean> {
    // Reset counters and status
    this.syncedFiles = 0;
    this.syncedFolders = 0;
    this.failedItems = [];
    
    // Prevent multiple syncs from running simultaneously
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping new request');
      this.toast({
        title: 'Sync in progress',
        description: 'Please wait for the current sync to complete',
      });
      return false;
    }

    this.syncInProgress = true;
    let allFilesAndFolders: { path: string, type: string, content?: string }[] = [];

    try {
      console.log(`Starting sync of ${owner}/${repo} (${branch}) to file system...`);

      // Fetch all repository contents recursively
      allFilesAndFolders = await this.apiService.fetchDirectoryContents(owner, repo, '', branch);
      console.log(`Fetched ${allFilesAndFolders.length} items from repository`);
      
      if (allFilesAndFolders.length === 0) {
        this.toast({
          title: 'Repository Empty',
          description: 'No files found in the repository',
          variant: 'destructive',
        });
        return false;
      }

      // Check for index.file and remove it if it exists
      const indexFileEntry = allFilesAndFolders.find(item => 
        item.type === 'file' && (item.path === 'index.file' || item.path.endsWith('/index.file'))
      );
      
      if (indexFileEntry) {
        console.log('Found problematic index.file in GitHub repo, removing it from sync list');
        allFilesAndFolders = allFilesAndFolders.filter(item => item !== indexFileEntry);
      }

      // Create a map to track folder creation status
      const folderCreationStatus = new Map<string, boolean>();
      folderCreationStatus.set('/', true); // Root folder always exists

      // First create all folders in depth order (sort by path length/depth)
      const folders = allFilesAndFolders
        .filter(item => item.type === 'folder')
        .sort((a, b) => {
          // Sort by path depth (count of slashes)
          const depthA = (a.path.match(/\//g) || []).length;
          const depthB = (b.path.match(/\//g) || []).length;
          return depthA - depthB;
        });

      console.log(`Creating ${folders.length} folders in order of depth`);

      // Create each folder with retry logic
      for (const folder of folders) {
        const folderPath = '/' + folder.path;
        const lastSlashIndex = folderPath.lastIndexOf('/');
        const parentPath = lastSlashIndex > 0 ? folderPath.substring(0, lastSlashIndex) : '/';
        const folderName = folderPath.substring(lastSlashIndex + 1);

        // Skip if this exact folder was already created
        if (folderCreationStatus.get(folderPath)) {
          console.log(`Folder already created: ${folderPath}`);
          continue;
        }

        let retries = 3;
        let folderCreated = false;
        
        while (retries > 0 && !folderCreated) {
          try {
            // Ensure parent folder exists first
            if (!folderCreationStatus.get(parentPath)) {
              // Try to create parent folder recursively
              const parentPathParts = parentPath.split('/').filter(Boolean);
              const grandparentPath = '/' + parentPathParts.slice(0, -1).join('/');
              const parentName = parentPathParts[parentPathParts.length - 1];
              
              if (grandparentPath && parentName) {
                await createFolder(grandparentPath || '/', parentName);
                folderCreationStatus.set(parentPath, true);
                this.syncedFolders++;
                console.log(`Created parent folder: ${parentPath}`);
              }
            }
            
            // Now create this folder
            console.log(`Attempting to create folder: ${folderName} at ${parentPath}`);
            await createFolder(parentPath, folderName);
            folderCreationStatus.set(folderPath, true);
            folderCreated = true;
            this.syncedFolders++;
            console.log(`Created folder: ${folderPath}`);
          } catch (error) {
            console.warn(`Attempt ${4-retries}/3: Folder creation failed: ${folderPath}`, error);
            retries--;
            // Short delay before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (!folderCreated) {
          console.error(`Failed to create folder after multiple attempts: ${folderPath}`);
          this.failedItems.push(folderPath);
          // Mark as created anyway to avoid blocking child files
          folderCreationStatus.set(folderPath, true);
        }
      }

      // Then create all files with retry logic
      const files = allFilesAndFolders
        .filter(item => item.type === 'file')
        // Skip index.file as an extra precaution
        .filter(item => !(item.path === 'index.file' || item.path.endsWith('/index.file')));
        
      console.log(`Creating ${files.length} files`);

      for (const file of files) {
        const filePath = '/' + file.path;
        const lastSlashIndex = filePath.lastIndexOf('/');
        const parentPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : '/';
        const fileName = filePath.substring(lastSlashIndex + 1);

        // Skip index.file as an extra precaution
        if (fileName === 'index.file') {
          console.log('Skipping problematic index.file');
          continue;
        }

        // Ensure parent folder exists or create it
        if (!folderCreationStatus.get(parentPath)) {
          try {
            console.log(`Creating missing parent folder: ${parentPath}`);
            const parentPathParts = parentPath.split('/').filter(Boolean);
            
            // Create parent folders recursively if needed
            let currentPath = '';
            for (const part of parentPathParts) {
              const nextPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
              if (!folderCreationStatus.get(nextPath)) {
                await createFolder(currentPath || '/', part);
                folderCreationStatus.set(nextPath, true);
                this.syncedFolders++;
                console.log(`Created parent folder: ${nextPath}`);
              }
              currentPath = nextPath;
            }
          } catch (error) {
            console.warn(`Failed to create parent folder ${parentPath}, continuing...`);
            this.failedItems.push(parentPath);
            folderCreationStatus.set(parentPath, true); // Assume it exists and try to create file
          }
        }

        // Fetch file content if not already available
        let content = file.content || '';
        if (!content) {
          try {
            content = await this.apiService.fetchFileContent(
              `${owner}/${repo}`,
              file.path,
              branch
            ) || '';
            console.log(`Fetched content for ${file.path}, length: ${content.length}`);
          } catch (error) {
            console.error(`Error fetching content for file ${file.path}:`, error);
          }
        }

        // Now create the file with retry logic
        let retries = 3;
        let fileCreated = false;
        
        while (retries > 0 && !fileCreated) {
          try {
            console.log(`Attempting to create file: ${fileName} at ${parentPath}`);
            await createFile(parentPath, fileName, content);
            this.syncedFiles++;
            fileCreated = true;
            console.log(`Created file: ${filePath} with content length: ${content.length}`);
          } catch (error) {
            console.warn(`Attempt ${4-retries}/3: File creation failed: ${filePath}`, error);
            retries--;
            // Short delay before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (!fileCreated) {
          console.error(`Failed to create file after multiple attempts: ${filePath}`);
          this.failedItems.push(filePath);
        }
      }

      console.log(`Synced ${this.syncedFolders} folders and ${this.syncedFiles} files from ${owner}/${repo} (${branch}) to file system. Failed items: ${this.failedItems.length}`);

      if (this.syncedFiles === 0 && this.syncedFolders === 0) {
        this.toast({
          title: 'Sync Issue',
          description: 'No files or folders were created. Please try again.',
          variant: 'destructive',
        });
        return false;
      }

      // Wait a bit to ensure all DB operations complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.toast({
        title: 'Repository Synced',
        description: `Imported ${this.syncedFiles} files and ${this.syncedFolders} folders${this.failedItems.length > 0 ? ` (${this.failedItems.length} errors)` : ''}`,
      });

      return this.syncedFiles > 0 || this.syncedFolders > 0;
    } catch (error: any) {
      console.error('Error syncing repo:', error);
      this.toast({
        title: 'Sync Failed',
        description: `Failed to sync repository: ${error.message}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }
}
