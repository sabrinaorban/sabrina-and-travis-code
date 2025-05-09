
import { FileOperation } from '../../../types/chat';
import { normalizePath } from './PathUtils';
import { OperationState, PROTECTED_FILES } from './OperationState';

// Process move-related delete operations
export const processMoveDeleteOperations = async (
  fileSystem: any,
  operations: FileOperation[],
  state: OperationState
): Promise<FileOperation[]> => {
  const results: FileOperation[] = [];
  
  for (const op of operations) {
    try {
      const cleanPath = normalizePath(op.path);
      
      // Don't delete protected files
      if (PROTECTED_FILES.includes(cleanPath) && !op.isSafeToDelete) {
        console.error(`[FileOperationService] Refusing to delete protected file: ${cleanPath}`);
        results.push({
          ...op,
          success: false,
          message: `Protected file ${cleanPath} cannot be deleted without explicit confirmation`
        });
        continue;
      }
      
      console.log(`[FileOperationService] Processing move-deletion for ${cleanPath}`);
      
      // SAFETY CHECK: Verify that the target file exists before deleting the source
      if (op.targetPath) {
        const targetExists = fileSystem.getFileByPath(op.targetPath);
        if (!targetExists) {
          console.error(`[FileOperationService] Cannot delete ${cleanPath} - target ${op.targetPath} not found`);
          results.push({
            ...op,
            success: false,
            message: `Delete aborted: target file not found at ${op.targetPath}`
          });
          continue;
        }
      }
      
      // Verify this file is marked as safe to delete
      if (!state.safeToDeleteFiles.has(cleanPath)) {
        console.error(`[FileOperationService] File ${cleanPath} not marked as safe to delete`);
        results.push({
          ...op,
          success: false,
          message: `Delete aborted: safety check failed for ${cleanPath}`
        });
        continue;
      }
      
      // Get file by path for deletion
      const fileToDelete = fileSystem.getFileByPath(cleanPath);
      if (fileToDelete) {
        console.log(`[FileOperationService] Deleting file after move: ${cleanPath} (ID: ${fileToDelete.id})`);
        await fileSystem.deleteFile(fileToDelete.id);
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} deleted after successful move`
        });
      } else {
        console.log(`[FileOperationService] File not found for deletion: ${cleanPath}`);
        results.push({
          ...op,
          success: false,
          message: `File not found at path: ${cleanPath}`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error deleting file ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Delete operation failed'
      });
    }
  }
  
  return results;
};

// Process manual delete operations
export const processManualDeleteOperations = async (
  fileSystem: any,
  operations: FileOperation[],
  state: OperationState
): Promise<FileOperation[]> => {
  const results: FileOperation[] = [];
  
  for (const op of operations) {
    try {
      const cleanPath = normalizePath(op.path);
      
      // Extra protection for critical files
      if (PROTECTED_FILES.includes(cleanPath)) {
        console.error(`[FileOperationService] Refusing to delete protected file: ${cleanPath}`);
        results.push({
          ...op,
          success: false,
          message: `Protected file ${cleanPath} cannot be deleted`
        });
        continue;
      }
      
      console.log(`[FileOperationService] Processing manual deletion for ${cleanPath}`);
      
      const fileToDelete = fileSystem.getFileByPath(cleanPath);
      if (fileToDelete) {
        console.log(`[FileOperationService] Deleting file: ${cleanPath} (ID: ${fileToDelete.id})`);
        await fileSystem.deleteFile(fileToDelete.id);
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} deleted`
        });
      } else {
        console.log(`[FileOperationService] File not found for deletion: ${cleanPath}`);
        results.push({
          ...op,
          success: false,
          message: `File not found at path: ${cleanPath}`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error deleting file ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Delete operation failed'
      });
    }
  }
  
  return results;
};
