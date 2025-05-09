
import { FileOperation } from '../../../types/chat';
import { OperationState } from './OperationState';
import { normalizePath } from './PathUtils';

// Process read operations
export const processReadOperations = async (
  fileSystem: any,
  operations: FileOperation[],
  state: OperationState
): Promise<FileOperation[]> => {
  const results: FileOperation[] = [];
  
  for (const op of operations) {
    try {
      console.log(`[FileOperationService] Reading file: ${op.path}`);
      const cleanPath = normalizePath(op.path);
      
      // Get the file object to include metadata
      const file = fileSystem.getFileByPath(cleanPath);
      
      // Ensure we track existing file IDs to prevent accidental deletion
      if (file) {
        state.fileIdMap.set(cleanPath, file.id);
        console.log(`[FileOperationService] Tracked file ID for ${cleanPath}: ${file.id}`);
      }
      
      const readResult = await fileSystem.getFileContentByPath(cleanPath);
      console.log(`[FileOperationService] Read result for ${cleanPath}:`, readResult ? 'Content received' : 'No content');
      
      // Store read content for potential move operations
      if (readResult) {
        state.readFiles.set(cleanPath, readResult);
      }
      
      results.push({
        ...op,
        content: readResult,
        fileInfo: file ? {
          name: file.name,
          path: file.path,
          type: file.type,
          lastModified: file.lastModified
        } : undefined,
        success: readResult !== null,
        message: readResult !== null ? `File ${cleanPath} read successfully` : `File not found or empty at ${cleanPath}`
      });
    } catch (error: any) {
      console.error(`[FileOperationService] Error reading file ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Read operation failed'
      });
    }
  }
  
  return results;
};
