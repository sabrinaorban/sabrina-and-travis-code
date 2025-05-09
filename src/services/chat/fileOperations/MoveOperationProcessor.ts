
import { FileOperation } from '../../../types/chat';
import { normalizePath, getPathParts } from './PathUtils';
import { OperationState } from './OperationState';
import { ensureFolderExists } from '../../utils/FileSystemUtils';

// Process move operations
export const processMoveOperations = async (
  fileSystem: any,
  operations: FileOperation[],
  state: OperationState
): Promise<FileOperation[]> => {
  const results: FileOperation[] = [];
  
  for (const op of operations) {
    try {
      if (!op.targetPath) {
        throw new Error(`${op.operation} operation requires a targetPath`);
      }
      
      const cleanSourcePath = normalizePath(op.path);
      const cleanTargetPath = normalizePath(op.targetPath);
      
      console.log(`[FileOperationService] ${op.operation} from ${cleanSourcePath} to ${cleanTargetPath}`);
      
      // Check source file exists
      const sourceFile = fileSystem.getFileByPath(cleanSourcePath);
      if (!sourceFile) {
        throw new Error(`Source file not found: ${cleanSourcePath}`);
      }
      
      // Remember the source file ID to preserve identity
      const sourceFileId = sourceFile.id;
      state.fileIdMap.set(cleanSourcePath, sourceFileId);
      
      // Get content from read operation cache or read it now
      let content = state.readFiles.get(cleanSourcePath);
      if (!content) {
        content = await fileSystem.getFileContentByPath(cleanSourcePath);
        if (content) {
          state.readFiles.set(cleanSourcePath, content);
        }
      }
      
      // Use provided content as fallback
      if (!content && op.content) {
        content = op.content;
      }
      
      if (!content) {
        throw new Error(`Could not get content for ${op.operation} operation from ${cleanSourcePath}`);
      }
      
      // Ensure target parent directory exists
      const { parentPath: targetParentPath, fileName: targetFileName } = getPathParts(cleanTargetPath);
      
      await ensureFolderExists(fileSystem, targetParentPath);
      
      // Create the file at target location  
      console.log(`[FileOperationService] Creating file at target: ${targetFileName} in ${targetParentPath}`);
      const newFile = await fileSystem.createFile(targetParentPath, targetFileName, content);
      
      // Track the new file's ID
      if (newFile && newFile.id) {
        state.createdFiles.set(cleanTargetPath, newFile.id);
        console.log(`[FileOperationService] Created file at target with ID: ${newFile.id}`);
      }
      
      results.push({
        operation: 'create',
        path: cleanTargetPath,
        content,
        preserveFileId: sourceFileId, // Track original file ID
        success: true,
        message: `File created at ${cleanTargetPath} as part of ${op.operation} operation`
      });
      
      // For move operations, mark source file as safe to delete
      if (op.operation === 'move') {
        state.safeToDeleteFiles.add(cleanSourcePath);
        console.log(`[FileOperationService] Marked ${cleanSourcePath} as safe to delete after successful move`);
        
        // Add delete operation with safety flags
        results.push({
          operation: 'delete',
          path: cleanSourcePath,
          targetPath: cleanTargetPath, 
          originOperation: 'move',
          sourceFile: sourceFileId,
          isSafeToDelete: true,
          success: true,
          message: `Source file ${cleanSourcePath} scheduled for deletion after move`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error in ${op.operation} operation:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || `${op.operation} operation failed`
      });
    }
  }
  
  return results;
};
