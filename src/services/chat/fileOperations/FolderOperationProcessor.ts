
import { FileOperation } from '../../../types/chat';
import { normalizePath, getPathParts } from './PathUtils';
import { OperationState } from './OperationState';
import { ensureFolderExists } from '../../utils/FileSystemUtils';

// Process folder creation operations
export const processFolderCreationOperations = async (
  fileSystem: any,
  operations: FileOperation[],
  state: OperationState
): Promise<FileOperation[]> => {
  const results: FileOperation[] = [];
  
  // Track paths that we've already processed in this batch to avoid duplicates
  const processedFolders = new Set<string>();
  
  for (const op of operations) {
    try {
      console.log(`[FileOperationService] Creating folder: ${op.path}`);
      const cleanPath = normalizePath(op.path);
      
      // Skip duplicate folder creations in the same batch
      if (processedFolders.has(cleanPath)) {
        console.log(`[FileOperationService] Skipping duplicate folder creation for: ${cleanPath}`);
        results.push({
          ...op,
          success: true,
          message: `Skipped duplicate folder creation for ${cleanPath}`
        });
        continue;
      }
      
      processedFolders.add(cleanPath);
      
      const pathWithoutTrailingSlash = cleanPath.replace(/\/$/, '');
      const { parentPath, fileName: folderName } = getPathParts(pathWithoutTrailingSlash);
      
      // Check if folder already exists to avoid errors
      const folderExists = fileSystem.getFileByPath(pathWithoutTrailingSlash);
      if (folderExists && folderExists.type === 'folder') {
        console.log(`[FileOperationService] Folder already exists: ${pathWithoutTrailingSlash}`);
        results.push({
          ...op,
          success: true,
          message: `Folder ${cleanPath} already exists`
        });
      } else {
        console.log(`[FileOperationService] Creating folder: ${folderName} in ${parentPath}`);
        await fileSystem.createFolder(parentPath, folderName);
        console.log(`[FileOperationService] Folder creation completed`);
        
        results.push({
          ...op,
          success: true,
          message: `Folder ${cleanPath} created`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error creating folder ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Folder creation failed'
      });
    }
  }
  
  return results;
};
