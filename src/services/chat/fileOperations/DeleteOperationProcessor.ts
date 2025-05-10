
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
  
  // Track paths that we've already processed in this batch to avoid duplicates
  const processedPaths = new Set<string>();
  
  for (const op of operations) {
    try {
      const cleanPath = normalizePath(op.path);
      
      // Skip duplicate delete operations for the same path in the same batch
      if (processedPaths.has(cleanPath)) {
        console.log(`[FileOperationService] Skipping duplicate delete for: ${cleanPath}`);
        results.push({
          ...op,
          success: true,
          message: `Skipped duplicate delete for ${cleanPath}`
        });
        continue;
      }
      
      processedPaths.add(cleanPath);
      
      // Don't delete protected files without explicit confirmation
      if (PROTECTED_FILES.includes(cleanPath) && !op.isConfirmed) {
        console.error(`[FileOperationService] Refusing to delete protected file without confirmation: ${cleanPath}`);
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
      if (!state.safeToDeleteFiles.has(cleanPath) && !op.isConfirmed) {
        console.error(`[FileOperationService] File ${cleanPath} not marked as safe to delete and not explicitly confirmed`);
        results.push({
          ...op,
          success: false,
          message: `Delete aborted: safety check failed for ${cleanPath}. Use isConfirmed: true to override safety checks.`
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
  
  // Track paths that we've already processed in this batch to avoid duplicates
  const processedPaths = new Set<string>();
  
  for (const op of operations) {
    try {
      const cleanPath = normalizePath(op.path);
      
      // Skip duplicate delete operations for the same path in the same batch
      if (processedPaths.has(cleanPath)) {
        console.log(`[FileOperationService] Skipping duplicate manual delete for: ${cleanPath}`);
        results.push({
          ...op,
          success: true,
          message: `Skipped duplicate manual delete for ${cleanPath}`
        });
        continue;
      }
      
      processedPaths.add(cleanPath);
      
      // Extra protection for critical files - require explicit confirmation
      if (PROTECTED_FILES.includes(cleanPath) && !op.isConfirmed) {
        console.error(`[FileOperationService] Refusing to delete protected file without confirmation: ${cleanPath}`);
        results.push({
          ...op,
          success: false,
          message: `Protected file ${cleanPath} requires explicit confirmation with isConfirmed: true`
        });
        continue;
      }
      
      // Make sure the operation has been explicitly confirmed
      if (op.requiresConfirmation && !op.isConfirmed) {
        console.error(`[FileOperationService] Delete operation requires confirmation: ${cleanPath}`);
        results.push({
          ...op,
          success: false,
          message: `Delete operation for ${cleanPath} requires explicit confirmation with isConfirmed: true`
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
