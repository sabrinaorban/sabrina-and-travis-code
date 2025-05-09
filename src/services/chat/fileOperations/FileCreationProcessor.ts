
import { FileOperation } from '../../../types/chat';
import { normalizePath, getPathParts } from './PathUtils';
import { OperationState } from './OperationState';
import { ensureFolderExists } from '../../utils/FileSystemUtils';

// Process file creation operations
export const processFileCreationOperations = async (
  fileSystem: any,
  operations: FileOperation[],
  state: OperationState
): Promise<FileOperation[]> => {
  const results: FileOperation[] = [];
  
  for (const op of operations) {
    try {
      console.log(`[FileOperationService] Creating file: ${op.path}`);
      const cleanPath = normalizePath(op.path);
      
      // Ensure parent directories exist
      const { parentPath, fileName } = getPathParts(cleanPath);
      
      await ensureFolderExists(fileSystem, parentPath);
      
      // Check if file already exists to avoid duplicate creation
      const existingFile = fileSystem.getFileByPath(cleanPath);
      if (existingFile && existingFile.type === 'file') {
        console.log(`[FileOperationService] File already exists: ${cleanPath}, updating it instead`);
        await fileSystem.updateFileByPath(cleanPath, op.content || '');
        
        // Track that this file was updated
        state.createdFiles.set(cleanPath, existingFile.id);
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} already existed and was updated`
        });
      } else {
        console.log(`[FileOperationService] Creating new file: ${fileName} in ${parentPath}`);
        const newFile = await fileSystem.createFile(parentPath, fileName, op.content || '');
        
        // If we get a file id back, track it
        if (newFile && newFile.id) {
          state.createdFiles.set(cleanPath, newFile.id);
          console.log(`[FileOperationService] Tracked new file ID for ${cleanPath}: ${newFile.id}`);
        }
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} created`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error creating file ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'File creation failed'
      });
    }
  }
  
  return results;
};

// Process file write operations
export const processWriteOperations = async (
  fileSystem: any,
  operations: FileOperation[],
  state: OperationState
): Promise<FileOperation[]> => {
  const results: FileOperation[] = [];
  
  for (const op of operations) {
    try {
      console.log(`[FileOperationService] Writing file: ${op.path}`);
      const cleanPath = normalizePath(op.path);
      
      // Ensure parent directories exist
      const { parentPath, fileName } = getPathParts(cleanPath);
      
      await ensureFolderExists(fileSystem, parentPath);
      
      // Check if file already exists
      const existingFile = fileSystem.getFileByPath(cleanPath);
      if (existingFile && existingFile.type === 'file') {
        console.log(`[FileOperationService] Updating existing file: ${cleanPath}`);
        await fileSystem.updateFileByPath(cleanPath, op.content || '');
        
        // Update tracked file
        state.createdFiles.set(cleanPath, existingFile.id);
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} updated`
        });
      } else {
        // File doesn't exist, create it
        console.log(`[FileOperationService] File doesn't exist, creating: ${fileName} in ${parentPath}`);
        const newFile = await fileSystem.createFile(parentPath, fileName, op.content || '');
        
        // Track the new file
        if (newFile && newFile.id) {
          state.createdFiles.set(cleanPath, newFile.id);
        }
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} created because it didn't exist`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error writing file ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Write operation failed'
      });
    }
  }
  
  return results;
};
