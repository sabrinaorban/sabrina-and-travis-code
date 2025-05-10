
import { FileOperation } from '../../../types/chat';
import { normalizePath } from './PathUtils';
import { OperationState } from './OperationState';

// Process read operations
export const processReadOperations = async (
  fileSystem: any,
  operations: FileOperation[],
  state: OperationState
): Promise<FileOperation[]> => {
  const results: FileOperation[] = [];
  
  // Track paths that we've already processed in this batch to avoid duplicates
  const processedPaths = new Set<string>();
  
  for (const op of operations) {
    try {
      console.log(`[FileOperationService] Reading file: ${op.path}`);
      const cleanPath = normalizePath(op.path);
      
      // Skip duplicate reads for the same path in the same batch
      if (processedPaths.has(cleanPath)) {
        // If we already have the content in our cache, use it
        const cachedContent = state.fileContentCache.get(cleanPath);
        
        console.log(`[FileOperationService] Using cached read for: ${cleanPath}`);
        results.push({
          ...op,
          success: true,
          message: `Used cached content for ${cleanPath}`,
          content: cachedContent
        });
        continue;
      }
      
      processedPaths.add(cleanPath);
      
      // Get file by path
      const existingFile = fileSystem.getFileByPath(cleanPath);
      
      if (existingFile && existingFile.type === 'file') {
        // Mark this file as safe to delete for move operations
        // This is a safety feature - only files that have been read first can be deleted
        state.safeToDeleteFiles.add(cleanPath);
        
        // Track the file existence and type
        state.existingPaths.set(cleanPath, 'file');
        
        // Track the file ID
        if (existingFile.id) {
          state.fileIds.set(cleanPath, existingFile.id);
        }
        
        // Get the content
        const content = existingFile.content || '';
        
        // Cache the content
        state.fileContentCache.set(cleanPath, content);
        
        results.push({
          ...op,
          success: true,
          message: `Successfully read file ${cleanPath}`,
          content
        });
        
        console.log(`[FileOperationService] Successfully read file: ${cleanPath}`);
      } else {
        if (existingFile && existingFile.type === 'folder') {
          // Track the folder existence
          state.existingPaths.set(cleanPath, 'folder');
          
          // Track the folder ID
          if (existingFile.id) {
            state.fileIds.set(cleanPath, existingFile.id);
          }
          
          console.log(`[FileOperationService] Path is a folder, not a file: ${cleanPath}`);
          results.push({
            ...op,
            success: false,
            message: `Path ${cleanPath} is a folder, not a file`
          });
        } else {
          console.log(`[FileOperationService] File not found at path: ${cleanPath}`);
          results.push({
            ...op,
            success: false,
            message: `File not found at path: ${cleanPath}`
          });
        }
      }
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
