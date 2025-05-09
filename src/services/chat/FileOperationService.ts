
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
      structure += `${indent}${file.name}\n`;
      if (file.type === 'folder' && file.children) {
        structure += formatStructure(file.children, `${indent}  `);
      }
    });
    return structure;
  };
  
  // Safely access files
  const files = fileSystem.files || [];
  return formatStructure(files);
};

// Process file operations
export const processFileOperations = async (
  fileSystem: any,
  operations: FileOperation[]
): Promise<FileOperation[]> => {
  if (!fileSystem || !operations || operations.length === 0) {
    return [];
  }
  
  const results: FileOperation[] = [];
  
  for (const op of operations) {
    try {
      // Ensure parent directories exist for any file operation
      if (op.operation === 'create' || op.operation === 'write') {
        const pathParts = op.path.split('/');
        pathParts.pop(); // Remove file name
        const dirPath = pathParts.join('/');
        
        if (dirPath) {
          await ensureFolderExists(fileSystem, dirPath);
        }
      }
      
      // Execute operation based on type
      switch (op.operation) {
        case 'read':
          const readResult = await fileSystem.getFileContentByPath(op.path);
          results.push({
            ...op,
            content: readResult,
            success: true
          });
          break;
        
        case 'write':
          await fileSystem.updateFileByPath(op.path, op.content || '');
          results.push({
            ...op,
            success: true,
            message: `File ${op.path} updated`
          });
          break;
        
        case 'create':
          if (op.path.endsWith('/') || !op.path.includes('.')) {
            // It's a folder
            const pathParts = op.path.split('/').filter(Boolean);
            const folderName = pathParts.pop() || '';
            const parentPath = '/' + pathParts.join('/');
            
            await fileSystem.createFolder(parentPath, folderName);
            results.push({
              ...op,
              success: true,
              message: `Folder ${op.path} created`
            });
          } else {
            // It's a file
            const pathParts = op.path.split('/');
            const fileName = pathParts.pop() || '';
            let parentPath = pathParts.join('/');
            if (!parentPath) parentPath = '/';
            
            await fileSystem.createFile(parentPath, fileName, op.content || '');
            results.push({
              ...op,
              success: true,
              message: `File ${op.path} created`
            });
          }
          break;
        
        case 'delete':
          const file = fileSystem.getFileByPath(op.path);
          if (file) {
            await fileSystem.deleteFile(file.id);
            results.push({
              ...op,
              success: true,
              message: `File ${op.path} deleted`
            });
          } else {
            throw new Error(`File not found at path: ${op.path}`);
          }
          break;
        
        default:
          results.push({
            ...op,
            success: false,
            message: `Unsupported operation: ${op.operation}`
          });
      }
    } catch (error: any) {
      console.error(`Error in file operation ${op.operation} for path ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Operation failed'
      });
    }
  }
  
  return results;
};
