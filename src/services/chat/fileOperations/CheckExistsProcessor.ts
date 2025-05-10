
import { FileOperation } from '../../../types/chat';
import { normalizePath } from './PathUtils';
import { OperationState } from './OperationState';

// Process check exists operations
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
      const cleanPath = normalizePath(op.path);
      
      // Skip duplicate check operations for the same path in the same batch
      if (processedPaths.has(cleanPath)) {
        console.log(`[FileOperationService] Skipping duplicate check exists for: ${cleanPath}`);
        results.push({
          ...op,
          success: true,
          message: `Skipped duplicate check for ${cleanPath}`
        });
        continue;
      }
      
      processedPaths.add(cleanPath);
      
      console.log(`[FileOperationService] Checking if path exists: ${cleanPath}`);
      
      // Get file or folder by path
      const existingItem = fileSystem.getFileByPath(cleanPath);
      
      if (existingItem) {
        console.log(`[FileOperationService] Path exists: ${cleanPath}, type: ${existingItem.type}`);
        
        // Store the existence and type information in state for other operations to use
        state.existingPaths.set(cleanPath, existingItem.type);
        
        // If it's a file, also cache the file ID
        if (existingItem.type === 'file' && existingItem.id) {
          state.fileIds.set(cleanPath, existingItem.id);
        }
        
        results.push({
          ...op,
          success: true,
          message: `Found ${existingItem.type} at ${cleanPath}`,
          fileInfo: {
            name: existingItem.name || '',
            path: existingItem.path || cleanPath,
            type: existingItem.type,
            lastModified: existingItem.lastModified || ''
          }
        });
      } else {
        console.log(`[FileOperationService] Path does not exist: ${cleanPath}`);
        
        results.push({
          ...op,
          success: true, // Still a successful operation, just indicates file doesn't exist
          message: `Path ${cleanPath} does not exist`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error checking if path exists ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Check exists operation failed'
      });
    }
  }
  
  return results;
};
