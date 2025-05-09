
import { FileSystemState, FileEntry } from '../../types';
import { FileOperation } from '../../types/chat';
import { ensureFolderExists } from '../utils/FileSystemUtils';

// Get project structure as a formatted string
export const getProjectStructure = async (fileSystem: any): Promise<string> => {
  if (!fileSystem || !fileSystem.fileSystem) {
    return 'No files available';
  }
  
  // Format project structure as a string
  const formatStructure = (files: FileEntry[] | undefined, indent = '') => {
    if (!files || files.length === 0) {
      return '';
    }
    
    let structure = '';
    files.forEach((file) => {
      structure += `${indent}${file.name} (${file.type})\n`;
      if (file.type === 'folder' && file.children) {
        structure += formatStructure(file.children, `${indent}  `);
      }
    });
    return structure;
  };
  
  // Safely access files
  const files = fileSystem.fileSystem.files || [];
  return formatStructure(files);
};

// Process file operations
export const processFileOperations = async (
  fileSystem: any,
  operations: FileOperation[]
): Promise<FileOperation[]> => {
  console.log('[FileOperationService] Starting to process operations:', operations);
  
  if (!fileSystem) {
    console.error('[FileOperationService] File system is not available');
    return [];
  }
  
  if (!operations || operations.length === 0) {
    console.log('[FileOperationService] No operations to process');
    return [];
  }
  
  const results: FileOperation[] = [];
  
  for (const op of operations) {
    try {
      console.log(`[FileOperationService] Processing ${op.operation} operation on path: ${op.path}`);
      
      // Normalize path: ensure it starts with / and remove trailing slashes
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
      console.log(`[FileOperationService] Normalized path: ${cleanPath}`);
      
      // Check if fileSystem methods exist
      if (!fileSystem.createFile || !fileSystem.createFolder || !fileSystem.updateFileByPath || !fileSystem.getFileByPath || !fileSystem.deleteFile) {
        console.error('[FileOperationService] File system methods are missing or incomplete', {
          createFile: !!fileSystem.createFile,
          createFolder: !!fileSystem.createFolder,
          updateFileByPath: !!fileSystem.updateFileByPath,
          getFileByPath: !!fileSystem.getFileByPath,
          deleteFile: !!fileSystem.deleteFile,
        });
        throw new Error('File system methods are incomplete');
      }
      
      // Ensure parent directories exist for any file operation
      if (op.operation === 'create' || op.operation === 'write') {
        // Skip folder creation step if this operation itself is creating a folder
        const isCreateFolder = op.operation === 'create' && 
                              (op.content === null || op.path.endsWith('/') || !op.path.includes('.'));
                              
        if (!isCreateFolder) {
          const pathParts = cleanPath.split('/');
          pathParts.pop(); // Remove file name
          const dirPath = pathParts.join('/');
          
          if (dirPath) {
            console.log(`[FileOperationService] Ensuring folder exists: ${dirPath}`);
            await ensureFolderExists(fileSystem, dirPath);
          }
        }
      }
      
      // Execute operation based on type
      switch (op.operation) {
        case 'read':
          console.log(`[FileOperationService] Reading file: ${cleanPath}`);
          const readResult = await fileSystem.getFileContentByPath(cleanPath);
          console.log(`[FileOperationService] Read result:`, readResult ? 'Content received' : 'No content');
          results.push({
            ...op,
            content: readResult,
            success: readResult !== null,
            message: readResult !== null ? 'File read successfully' : 'File not found or empty'
          });
          break;
        
        case 'write':
          console.log(`[FileOperationService] Writing file: ${cleanPath}, content length: ${(op.content || '').length}`);
          await fileSystem.updateFileByPath(cleanPath, op.content || '');
          console.log(`[FileOperationService] Write completed`);
          results.push({
            ...op,
            success: true,
            message: `File ${cleanPath} updated`
          });
          break;
        
        case 'create':
          if (op.content === null || cleanPath.endsWith('/') || !cleanPath.includes('.')) {
            // It's a folder
            const pathWithoutTrailingSlash = cleanPath.replace(/\/$/, '');
            const pathParts = pathWithoutTrailingSlash.split('/').filter(Boolean);
            const folderName = pathParts.pop() || '';
            const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
            
            console.log(`[FileOperationService] Creating folder: ${folderName} in ${parentPath}`);
            await fileSystem.createFolder(parentPath, folderName);
            console.log(`[FileOperationService] Folder creation completed`);
            
            results.push({
              ...op,
              success: true,
              message: `Folder ${cleanPath} created`
            });
          } else {
            // It's a file
            const pathParts = cleanPath.split('/');
            const fileName = pathParts.pop() || '';
            const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
            
            console.log(`[FileOperationService] Creating file: ${fileName} in ${parentPath} with content length: ${(op.content || '').length}`);
            await fileSystem.createFile(parentPath, fileName, op.content || '');
            console.log(`[FileOperationService] File creation completed`);
            
            results.push({
              ...op,
              success: true,
              message: `File ${cleanPath} created`
            });
          }
          break;
        
        case 'delete':
          console.log(`[FileOperationService] Deleting file: ${cleanPath}`);
          const file = fileSystem.getFileByPath(cleanPath);
          if (file) {
            await fileSystem.deleteFile(file.id);
            console.log(`[FileOperationService] Delete completed`);
            results.push({
              ...op,
              success: true,
              message: `File ${cleanPath} deleted`
            });
          } else {
            console.error(`[FileOperationService] File not found for deletion: ${cleanPath}`);
            throw new Error(`File not found at path: ${cleanPath}`);
          }
          break;
        
        default:
          console.warn(`[FileOperationService] Unsupported operation: ${op.operation}`);
          results.push({
            ...op,
            success: false,
            message: `Unsupported operation: ${op.operation}`
          });
      }
      
      // After each operation, refresh files to update UI
      if (fileSystem.refreshFiles) {
        console.log(`[FileOperationService] Refreshing files after operation`);
        await fileSystem.refreshFiles();
      }
      
    } catch (error: any) {
      console.error(`[FileOperationService] Error in file operation ${op.operation} for path ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Operation failed'
      });
    }
  }
  
  console.log('[FileOperationService] Finished processing operations. Results:', results);
  return results;
};
