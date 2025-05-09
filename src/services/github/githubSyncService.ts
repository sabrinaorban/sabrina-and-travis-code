
import { useToast } from '@/hooks/use-toast';
import { GithubApiService } from './githubApiService';

export class GithubSyncService {
  private apiService: GithubApiService;
  private toast: ReturnType<typeof useToast>['toast']; 
  private syncInProgress: boolean = false;

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
    let createdFolders = 0;
    let createdFiles = 0;
    let errors = 0;

    try {
      console.log(`Starting sync of ${owner}/${repo} (${branch}) to file system...`);

      // Fetch all repository contents recursively
      const allContents = await this.apiService.fetchDirectoryContents(owner, repo, '', branch);
      console.log(`Fetched ${allContents.length} items from repository`);

      // Create a map to track folder creation status
      const folderCreationStatus = new Map<string, boolean>();
      folderCreationStatus.set('/', true); // Root folder always exists

      // First create all folders in depth order (sort by path length/depth)
      const folders = allContents
        .filter(item => item.type === 'folder')
        .sort((a, b) => {
          // Sort by path depth (count of slashes)
          const depthA = (a.path.match(/\//g) || []).length;
          const depthB = (b.path.match(/\//g) || []).length;
          return depthA - depthB;
        });

      console.log(`Creating ${folders.length} folders in order of depth`);

      // Create each folder
      for (const folder of folders) {
        const folderPath = '/' + folder.path;
        const lastSlashIndex = folderPath.lastIndexOf('/');
        const parentPath = lastSlashIndex > 0 ? folderPath.substring(0, lastSlashIndex) : '/';
        const folderName = folderPath.substring(lastSlashIndex + 1);

        // Skip if this exact folder was already created
        if (folderCreationStatus.get(folderPath)) {
          continue;
        }

        // Ensure all parent folders exist
        if (folderCreationStatus.get(parentPath)) {
          try {
            await createFolder(parentPath, folderName);
            folderCreationStatus.set(folderPath, true);
            createdFolders++;
            console.log(`Created folder: ${folderPath}`);
          } catch (error) {
            console.warn(`Folder ${folderName} at ${parentPath} might already exist, continuing...`);
            folderCreationStatus.set(folderPath, true); // Assume it exists if creation fails
          }
        } else {
          console.warn(`Cannot create folder ${folderPath} because parent ${parentPath} doesn't exist`);
          // Try to create parent folder first
          const parentLastSlashIndex = parentPath.lastIndexOf('/');
          const parentParentPath = parentLastSlashIndex > 0 ? parentPath.substring(0, parentLastSlashIndex) : '/';
          const parentFolderName = parentPath.substring(parentLastSlashIndex + 1);

          if (folderCreationStatus.get(parentParentPath)) {
            try {
              await createFolder(parentParentPath, parentFolderName);
              folderCreationStatus.set(parentPath, true);
              createdFolders++;
              console.log(`Created parent folder: ${parentPath}`);

              // Now try to create the original folder
              await createFolder(parentPath, folderName);
              folderCreationStatus.set(folderPath, true);
              createdFolders++;
              console.log(`Created folder: ${folderPath}`);
            } catch (error) {
              console.error(`Failed to create parent folder ${parentPath}:`, error);
              errors++;
            }
          }
        }
      }

      // Then create all files
      const files = allContents.filter(item => item.type === 'file');
      console.log(`Creating ${files.length} files`);

      for (const file of files) {
        const filePath = '/' + file.path;
        const lastSlashIndex = filePath.lastIndexOf('/');
        const parentPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : '/';
        const fileName = filePath.substring(lastSlashIndex + 1);

        // Ensure parent folder exists
        if (!folderCreationStatus.get(parentPath)) {
          // Create missing parent folder
          const parentLastSlashIndex = parentPath.lastIndexOf('/');
          const parentParentPath = parentLastSlashIndex > 0 ? parentPath.substring(0, parentLastSlashIndex) : '/';
          const parentFolderName = parentPath.substring(parentLastSlashIndex + 1);

          try {
            await createFolder(parentParentPath, parentFolderName);
            folderCreationStatus.set(parentPath, true);
            createdFolders++;
            console.log(`Created missing parent folder: ${parentPath}`);
          } catch (error) {
            console.warn(`Failed to create parent folder ${parentPath}, continuing...`);
            folderCreationStatus.set(parentPath, true); // Assume it exists anyway and try to create file
          }
        }

        // Fetch file content before creating the file
        let content = '';
        try {
          content = await this.apiService.fetchFileContent(
            `${owner}/${repo}`,
            file.path,
            branch
          ) || '';
        } catch (error) {
          console.error(`Error fetching content for file ${file.path}:`, error);
          // Continue with empty content
        }

        // Now create the file
        if (folderCreationStatus.get(parentPath)) {
          try {
            await createFile(parentPath, fileName, content);
            createdFiles++;
            console.log(`Created file: ${filePath} with content length: ${content.length}`);
          } catch (error: any) {
            console.error(`Error creating file ${fileName} at ${parentPath}:`, error);
            errors++;
          }
        } else {
          console.warn(`Skipping file ${fileName} because parent ${parentPath} wasn't created`);
          errors++;
        }
      }

      console.log(`Synced ${createdFolders} folders and ${createdFiles} files from ${owner}/${repo} (${branch}) to file system. ${errors} errors.`);

      this.toast({
        title: 'Repository Synced',
        description: `Imported ${createdFiles} files and ${createdFolders} folders${errors > 0 ? ` (${errors} errors)` : ''}`,
      });

      return true;
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
