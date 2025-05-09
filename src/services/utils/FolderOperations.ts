
import { FileEntry } from '../../types';

// Enhanced implementation of ensuring a folder exists, creating parent folders as needed
export const ensureFolderExists = async (fileSystem: any, folderPath: string): Promise<void> => {
  if (!fileSystem || !fileSystem.createFolder) {
    console.error('[FolderOperations] Invalid fileSystem object or missing createFolder method');
    return;
  }
  
  if (folderPath === '/' || folderPath === '') {
    console.log('[FolderOperations] Root folder already exists, nothing to do');
    return;
  }
  
  // Clean up the path (remove trailing slashes)
  const cleanPath = folderPath.replace(/\/+$/, '');
  console.log(`[FolderOperations] Ensuring folder exists: ${cleanPath}`);
  
  // Check if folder exists
  const folder = fileSystem.getFileByPath ? fileSystem.getFileByPath(cleanPath) : null;
  if (folder) {
    console.log(`[FolderOperations] Folder already exists: ${cleanPath}`);
    return;
  }
  
  console.log(`[FolderOperations] Creating folder structure for: ${cleanPath}`);
  
  // Need to create folder - ensure parent folders exist first
  const segments = cleanPath.split('/').filter(Boolean);
  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const nextPath = currentPath === '' ? `/${segment}` : `${currentPath}/${segment}`;
    const existingFolder = fileSystem.getFileByPath ? fileSystem.getFileByPath(nextPath) : null;
    
    if (!existingFolder) {
      // Create this folder - path is parent, name is segment
      const parentPath = currentPath === '' ? '/' : currentPath;
      console.log(`[FolderOperations] Creating folder ${segment} at ${parentPath}`);
      
      try {
        await fileSystem.createFolder(parentPath, segment);
        console.log(`[FolderOperations] Created folder ${segment} at ${parentPath}`);
      } catch (error) {
        console.error(`[FolderOperations] Error creating folder ${segment} at ${parentPath}:`, error);
      }
    } else {
      console.log(`[FolderOperations] Folder already exists: ${nextPath}`);
    }
    
    currentPath = nextPath;
  }
  
  // Refresh files to update the UI
  if (fileSystem.refreshFiles) {
    console.log(`[FolderOperations] Refreshing files after folder creation`);
    await fileSystem.refreshFiles();
  }
};
