
import { useToast } from '@/hooks/use-toast';
import { GithubApiService } from './githubApiService';

export class GithubSyncService {
  private apiService: GithubApiService;
  private toast: ReturnType<typeof useToast>['toast']; 
  private syncInProgress: boolean = false;
  private syncedFiles: number = 0;
  private syncedFolders: number = 0;
  private failedItems: string[] = [];
  private lastSyncAttempt: number = 0;
  private SYNC_COOLDOWN_MS: number = 10000; // 10 seconds cooldown

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
    
    // Check cooldown
    const now = Date.now();
    if (now - this.lastSyncAttempt < this.SYNC_COOLDOWN_MS) {
      console.log(`GithubSyncService - Sync attempted too quickly. Please wait ${this.SYNC_COOLDOWN_MS/1000} seconds`);
      this.toast({
        title: 'Please wait',
        description: `Please wait ${this.SYNC_COOLDOWN_MS/1000} seconds between sync attempts`,
        variant: 'destructive',
      });
      return false;
    }
    
    // Prevent multiple syncs from running simultaneously
    if (this.syncInProgress) {
      console.log('GithubSyncService - Sync already in progress, skipping new request');
      this.toast({
        title: 'Sync in progress',
        description: 'Please wait for the current sync to complete',
      });
      return false;
    }

    console.log(`GithubSyncService - Starting sync of ${owner}/${repo} (${branch})`);
    this.syncInProgress = true;
    this.lastSyncAttempt = now;
    let allFilesAndFolders: { path: string, type: string, content?: string }[] = [];

    try {
      // Fetch all repository contents recursively
      console.log(`GithubSyncService - Fetching repo contents for ${owner}/${repo} (${branch})`);
      
      try {
        allFilesAndFolders = await this.apiService.fetchDirectoryContents(owner, repo, '', branch);
        console.log(`GithubSyncService - Fetched ${allFilesAndFolders.length} items from repository`);
      } catch (fetchError: any) {
        console.error('GithubSyncService - Error fetching repository contents:', fetchError);
        this.toast({
          title: 'Repository Access Error',
          description: fetchError.message || 'Failed to access repository contents',
          variant: 'destructive',
        });
        return false;
      }
      
      if (!Array.isArray(allFilesAndFolders) || allFilesAndFolders.length === 0) {
        console.log('GithubSyncService - Repository is empty or access denied');
        this.toast({
          title: 'Repository Empty or Access Denied',
          description: 'No files found in the repository or you may not have access',
          variant: 'destructive',
        });
        return false;
      }

      // Filter out problematic files
      const PROBLEMATIC_FILES = ['index.file'];
      allFilesAndFolders = allFilesAndFolders.filter(item => {
        const isProblematic = PROBLEMATIC_FILES.some(name => {
          return item.type === 'file' && 
                (item.path === name || item.path.endsWith(`/${name}`));
        });
        
        if (isProblematic) {
          console.log(`GithubSyncService - Filtering out problematic file: ${item.path}`);
          return false;
        }
        return true;
      });

      // Create a map to track folder creation status
      const folderCreationStatus = new Map<string, boolean>();
      folderCreationStatus.set('/', true); // Root folder always exists

      // First create all folders in depth order (sort by path length/depth)
      console.log('GithubSyncService - Creating folders');
      const folders = allFilesAndFolders
        .filter(item => item.type === 'folder')
        .sort((a, b) => {
          // Sort by path depth (count of slashes)
          const depthA = (a.path.match(/\//g) || []).length;
          const depthB = (b.path.match(/\//g) || []).length;
          return depthA - depthB;
        });

      console.log(`GithubSyncService - Creating ${folders.length} folders in order of depth`);

      // Create each folder
      for (const folder of folders) {
        const folderPath = '/' + folder.path;
        const lastSlashIndex = folderPath.lastIndexOf('/');
        const parentPath = lastSlashIndex > 0 ? folderPath.substring(0, lastSlashIndex) : '/';
        const folderName = folderPath.substring(lastSlashIndex + 1);

        // Skip if this exact folder was already created
        if (folderCreationStatus.get(folderPath)) {
          console.log(`GithubSyncService - Skipping folder (already created): ${folderPath}`);
          continue;
        }

        try {
          // Ensure parent folder exists first
          if (!folderCreationStatus.get(parentPath)) {
            // Create parent folder recursively
            console.log(`GithubSyncService - Parent folder missing: ${parentPath}`);
            
            // Try to create parent folders recursively
            const pathParts = parentPath.split('/').filter(Boolean);
            
            // Build parent folders one by one
            let currentPath = '';
            for (const part of pathParts) {
              const nextPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
              if (!folderCreationStatus.get(nextPath)) {
                try {
                  console.log(`GithubSyncService - Creating parent folder: ${part} at ${currentPath || '/'}`);
                  await createFolder(currentPath || '/', part);
                  folderCreationStatus.set(nextPath, true);
                  this.syncedFolders++;
                } catch (error) {
                  console.error(`GithubSyncService - Failed to create parent folder ${nextPath}:`, error);
                  // Don't throw, try to continue with remaining folders
                }
              }
              currentPath = nextPath;
            }
          }
          
          // Now create this folder
          console.log(`GithubSyncService - Creating folder: ${folderName} at ${parentPath}`);
          await createFolder(parentPath, folderName);
          folderCreationStatus.set(folderPath, true);
          this.syncedFolders++;
        } catch (error) {
          console.error(`GithubSyncService - Failed to create folder: ${folderPath}`, error);
          this.failedItems.push(folderPath);
          
          // Mark as created anyway to avoid dependency issues
          folderCreationStatus.set(folderPath, true);
        }
      }

      // Then create all files
      console.log('GithubSyncService - Creating files');
      const files = allFilesAndFolders
        .filter(item => item.type === 'file')
        // Skip index.file as an extra precaution
        .filter(item => !(item.path === 'index.file' || item.path.endsWith('/index.file')));
        
      console.log(`GithubSyncService - Creating ${files.length} files`);

      // Process files in smaller batches to avoid overwhelming the system
      const BATCH_SIZE = 10;
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        console.log(`GithubSyncService - Processing file batch ${i/BATCH_SIZE + 1}/${Math.ceil(files.length/BATCH_SIZE)}`);
        
        // Process each file in the batch
        await Promise.all(batch.map(async (file) => {
          const filePath = '/' + file.path;
          const lastSlashIndex = filePath.lastIndexOf('/');
          const parentPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : '/';
          const fileName = filePath.substring(lastSlashIndex + 1);

          console.log(`GithubSyncService - Processing file: ${fileName} in ${parentPath}`);

          // Ensure parent folder exists or create it
          if (!folderCreationStatus.get(parentPath)) {
            try {
              console.log(`GithubSyncService - Creating missing parent folder for file: ${parentPath}`);
              
              // Create parent folders recursively if needed
              const pathParts = parentPath.split('/').filter(Boolean);
              let currentPath = '';
              for (const part of pathParts) {
                const nextPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
                if (!folderCreationStatus.get(nextPath)) {
                  try {
                    console.log(`GithubSyncService - Creating parent folder: ${part} at ${currentPath || '/'}`);
                    await createFolder(currentPath || '/', part);
                    folderCreationStatus.set(nextPath, true);
                    this.syncedFolders++;
                  } catch (error) {
                    console.error(`GithubSyncService - Failed to create parent folder ${nextPath}:`, error);
                    // Continue anyway to try creating the file
                  }
                }
                currentPath = nextPath;
              }
              
              // Mark parent path as created
              folderCreationStatus.set(parentPath, true);
            } catch (error) {
              console.error(`GithubSyncService - Error creating parent folder ${parentPath}:`, error);
              this.failedItems.push(parentPath);
              // Try to create the file anyway
            }
          }

          // Get content for the file if not already available
          let content = file.content || '';
          if (!content) {
            try {
              console.log(`GithubSyncService - Fetching content for ${file.path}`);
              content = await this.apiService.fetchFileContent(
                `${owner}/${repo}`,
                file.path,
                branch
              ) || '';
              console.log(`GithubSyncService - Content fetched for ${file.path}, length: ${content.length}`);
            } catch (error) {
              console.error(`GithubSyncService - Error fetching content for file ${file.path}:`, error);
              this.failedItems.push(filePath);
              return; // Skip this file if we can't get content
            }
          }

          // Now create the file
          try {
            console.log(`GithubSyncService - Creating file: ${fileName} at ${parentPath} with content length: ${content.length}`);
            await createFile(parentPath, fileName, content);
            this.syncedFiles++;
            console.log(`GithubSyncService - Created file: ${filePath}`);
          } catch (error) {
            console.error(`GithubSyncService - Failed to create file: ${filePath}`, error);
            this.failedItems.push(filePath);
          }
        }));
        
        // Add a small delay between batches
        if (i + BATCH_SIZE < files.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`GithubSyncService - Sync completed: ${this.syncedFolders} folders, ${this.syncedFiles} files, ${this.failedItems.length} failures`);

      // Check if any files/folders were created
      if (this.syncedFiles === 0 && this.syncedFolders === 0) {
        console.error('GithubSyncService - Sync failed: no files or folders were created');
        this.toast({
          title: 'Sync Issue',
          description: 'No files or folders were created. Please try again.',
          variant: 'destructive',
        });
        return false;
      }

      this.toast({
        title: 'Repository Synced',
        description: `Imported ${this.syncedFiles} files and ${this.syncedFolders} folders${this.failedItems.length > 0 ? ` (${this.failedItems.length} errors)` : ''}`,
      });

      return this.syncedFiles > 0 || this.syncedFolders > 0;
    } catch (error: any) {
      console.error('GithubSyncService - Error syncing repo:', error);
      this.toast({
        title: 'Sync Failed',
        description: `Failed to sync repository: ${error.message}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      // Reset sync status with a small delay to prevent immediate re-triggering
      setTimeout(() => {
        this.syncInProgress = false;
        console.log('GithubSyncService - Sync lock released');
      }, 2000);
    }
  }
}
