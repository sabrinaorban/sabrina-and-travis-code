
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
      console.log(`Processing ${op.operation} operation on path: ${op.path}`);
      
      // Normalize path: ensure it starts with / and remove trailing slashes
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
      // Ensure parent directories exist for any file operation
      if (op.operation === 'create' || op.operation === 'write') {
        // Skip folder creation step if this operation itself is creating a folder
        if (!(op.operation === 'create' && (cleanPath.endsWith('/') || !cleanPath.includes('.')))) {
          const pathParts = cleanPath.split('/');
          pathParts.pop(); // Remove file name
          const dirPath = pathParts.join('/');
          
          if (dirPath) {
            console.log(`Ensuring folder exists: ${dirPath}`);
            await ensureFolderExists(fileSystem, dirPath);
          }
        }
      }
      
      // Execute operation based on type
      switch (op.operation) {
        case 'read':
          const readResult = await fileSystem.getFileContentByPath(cleanPath);
          results.push({
            ...op,
            content: readResult,
            success: true
          });
          break;
        
        case 'write':
          await fileSystem.updateFileByPath(cleanPath, op.content || '');
          results.push({
            ...op,
            success: true,
            message: `File ${cleanPath} updated`
          });
          break;
        
        case 'create':
          if (cleanPath.endsWith('/') || !cleanPath.includes('.')) {
            // It's a folder
            const pathWithoutTrailingSlash = cleanPath.replace(/\/$/, '');
            const pathParts = pathWithoutTrailingSlash.split('/').filter(Boolean);
            const folderName = pathParts.pop() || '';
            const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
            
            console.log(`Creating folder: ${folderName} in ${parentPath}`);
            await fileSystem.createFolder(parentPath, folderName);
            
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
            
            console.log(`Creating file: ${fileName} in ${parentPath} with content length: ${(op.content || '').length}`);
            await fileSystem.createFile(parentPath, fileName, op.content || '');
            
            results.push({
              ...op,
              success: true,
              message: `File ${cleanPath} created`
            });
          }
          break;
        
        case 'delete':
          const file = fileSystem.getFileByPath(cleanPath);
          if (file) {
            await fileSystem.deleteFile(file.id);
            results.push({
              ...op,
              success: true,
              message: `File ${cleanPath} deleted`
            });
          } else {
            throw new Error(`File not found at path: ${cleanPath}`);
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
