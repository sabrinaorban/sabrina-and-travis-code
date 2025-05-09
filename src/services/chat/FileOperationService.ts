
import { FileSystemState, FileEntry } from '../../types';
import { FileOperation } from '../../types/chat';
import { ensureFolderExists } from '../utils/FileSystemUtils';

// Get project structure as a formatted string
export const getProjectStructure = async (fileSystem: any): Promise<string> => {
  if (!fileSystem || !fileSystem.files) {
    return 'No files available';
  }
  
  // Format project structure as a string
  const formatStructure = (files: FileEntry[], indent = '') => {
    let structure = '';
    files.forEach((file) => {
      structure += `${indent}${file.name}\n`;
      if (file.type === 'folder' && file.children) {
        structure += formatStructure(file.children, `${indent}  `);
      }
    });
    return structure;
  };
  
  return formatStructure(fileSystem.files);
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
          const readResult = await fileSystem.readFile(op.path);
          results.push({
            ...op,
            content: readResult,
            success: true
          });
          break;
        
        case 'write':
          await fileSystem.writeFile(op.path, op.content || '');
          results.push({
            ...op,
            success: true,
            message: `File ${op.path} updated`
          });
          break;
        
        case 'create':
          if (op.path.endsWith('/') || !op.path.includes('.')) {
            await fileSystem.createFolder(op.path);
            results.push({
              ...op,
              success: true,
              message: `Folder ${op.path} created`
            });
          } else {
            await fileSystem.createFile(op.path, op.content || '');
            results.push({
              ...op,
              success: true,
              message: `File ${op.path} created`
            });
          }
          break;
        
        case 'delete':
          await fileSystem.deleteFile(op.path);
          results.push({
            ...op,
            success: true,
            message: `File ${op.path} deleted`
          });
          break;
        
        default:
          results.push({
            ...op,
            success: false,
            message: `Unsupported operation: ${op.operation}`
          });
      }
    } catch (error: any) {
      results.push({
        ...op,
        success: false,
        message: error.message || 'Operation failed'
      });
    }
  }
  
  return results;
};
