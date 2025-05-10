
import { FileOperation } from '../../../types/chat';
import { normalizePath } from './PathUtils';
import { OperationState } from './OperationState';

// Process check existence operations
export const processCheckExistsOperations = async (
  fileSystem: any,
  operations: FileOperation[],
  state: OperationState
): Promise<FileOperation[]> => {
  const results: FileOperation[] = [];
  
  // Track paths that we've already processed in this batch to avoid duplicates
  const processedPaths = new Set<string>();
  
  for (const op of operations) {
    try {
      console.log(`[FileOperationService] Checking if exists: ${op.path}`);
      const cleanPath = normalizePath(op.path);
      
      // Skip duplicate checks for the same path in the same batch
      if (processedPaths.has(cleanPath)) {
        console.log(`[FileOperationService] Skipping duplicate check for: ${cleanPath}`);
        results.push({
          ...op,
          success: true,
          message: `Skipped duplicate check for ${cleanPath}`
        });
        continue;
      }
      
      processedPaths.add(cleanPath);
      
      // Check if the path exists and what type it is
      const existingItem = fileSystem.getFileByPath(cleanPath);
      
      if (existingItem) {
        console.log(`[FileOperationService] Item exists at path ${cleanPath}: ${existingItem.type}`);
        
        // Track the existence in the state
        state.existingPaths.set(cleanPath, existingItem.type);
        
        // Return success with type information
        results.push({
          ...op,
          success: true,
          message: `${existingItem.type === 'folder' ? 'Folder' : 'File'} exists at path ${cleanPath}`
        });
      } else {
        console.log(`[FileOperationService] No item exists at path ${cleanPath}`);
        
        results.push({
          ...op,
          success: true,
          message: `No item exists at path ${cleanPath}`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error checking existence for ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Existence check failed'
      });
    }
  }
  
  return results;
};
