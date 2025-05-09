
import { FileOperation } from '../../types/chat';
import { FileSystemContextType } from '../../types/fileSystem';

// Function to get project structure (renamed to avoid conflicts)
export const getSimpleProjectStructure = async (fileSystem: FileSystemContextType): Promise<string> => {
  if (!fileSystem || !fileSystem.fileSystem) {
    return 'File system not available';
  }
  
  const files = fileSystem.fileSystem.files;
  
  if (!files || files.length === 0) {
    return 'No files found';
  }
  
  const structure = files.map(file => {
    if (file.type === 'file') {
      return `- ${file.path} (file)`;
    } else {
      return `- ${file.path} (folder)`;
    }
  }).join('\n');
  
  return structure;
};

// Handle file operation from the assistant
export const handleFileOperation = async (
  fileSystem: any,
  operation: string,
  path: string,
  content?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!fileSystem) {
      return { success: false, message: 'File system not available' };
    }
    
    console.log(`Processing file operation: ${operation} on ${path}`);
    
    // When creating files, ensure parent folders exist
    if (operation === 'create' || operation === 'write') {
      // If it's a folder (content is null)
      if (content === null && (path.endsWith('/') || !path.includes('.'))) {
        await ensureFolderExists(fileSystem, path);
        return { success: true, message: `Folder ${path} created successfully` };
      } else {
        // It's a file, so ensure its parent folder exists
        const lastSlashIndex = path.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          const folderPath = path.substring(0, lastSlashIndex);
          await ensureFolderExists(fileSystem, folderPath);
        }
        
        // Get folder path and file name
        const fileName = path.substring(lastSlashIndex + 1);
        const folderPath = lastSlashIndex === 0 ? '/' : path.substring(0, lastSlashIndex);
        
        if (operation === 'create') {
          await fileSystem.createFile(folderPath, fileName, content || '');
          return { success: true, message: `File ${path} created successfully` };
        } else {
          await fileSystem.updateFileByPath(path, content || '');
          return { success: true, message: `File ${path} updated successfully` };
        }
      }
    } else if (operation === 'read') {
      const content = fileSystem.getFileContentByPath(path);
      if (content === null) {
        return { success: false, message: `File not found at path: ${path}` };
      }
      return { success: true, message: `File ${path} read successfully` };
    } else if (operation === 'delete') {
      // Need file ID to delete - get it from path
      const file = fileSystem.getFileByPath(path);
      if (!file) {
        return { success: false, message: `File not found at path: ${path}` };
      }
      
      await fileSystem.deleteFile(file.id);
      return { success: true, message: `File ${path} deleted successfully` };
    } else {
      return { success: false, message: `Unsupported operation: ${operation}` };
    }
  } catch (error: any) {
    console.error(`Error performing file operation ${operation} on ${path}:`, error);
    return {
      success: false,
      message: error.message || `Failed to ${operation} file ${path}`
    };
  }
};

// Enhanced implementation of ensuring a folder exists, creating parent folders as needed
export const ensureFolderExists = async (fileSystem: any, folderPath: string): Promise<void> => {
  if (folderPath === '/' || folderPath === '') return;
  
  // Clean up the path (remove trailing slashes)
  const cleanPath = folderPath.replace(/\/+$/, '');
  
  // Check if folder exists
  const folder = fileSystem.getFileByPath(cleanPath);
  if (folder) return;
  
  console.log(`Creating folder structure for: ${cleanPath}`);
  
  // Need to create folder - ensure parent folders exist first
  const segments = cleanPath.split('/').filter(Boolean);
  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const nextPath = currentPath === '' ? `/${segment}` : `${currentPath}/${segment}`;
    const folder = fileSystem.getFileByPath(nextPath);
    
    if (!folder) {
      // Create this folder - path is parent, name is segment
      const parentPath = currentPath === '' ? '/' : currentPath;
      await fileSystem.createFolder(parentPath, segment);
      console.log(`Created folder ${segment} at ${parentPath}`);
    }
    
    currentPath = nextPath;
  }
};

// Renamed to avoid conflicts
export const processSimpleFileOperations = async (
  fileSystem: any,
  fileOperations: FileOperation[]
): Promise<FileOperation[]> => {
  let processedOperations: FileOperation[] = [];
  
  if (fileOperations && fileOperations.length > 0) {
    for (const op of fileOperations) {
      const result = await handleFileOperation(
        fileSystem,
        op.operation,
        op.path,
        op.content
      );
      
      processedOperations.push({
        ...op,
        success: result.success,
        message: result.message
      });
      
      console.log(`File operation result:`, result);
    }
  }
  
  return processedOperations;
};
