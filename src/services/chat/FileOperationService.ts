
import { FileSystemContextType } from '../../types/fileSystem';
import { FileOperation } from '../../types/chat';

export interface FileOpsResult {
  operation: string;
  path: string;
  success: boolean;
  message?: string;
}

// Process file operations requested by the assistant
export const processFileOperations = async (
  fileSystem: FileSystemContextType, 
  fileOperations: FileOperation[]
): Promise<FileOpsResult[]> => {
  if (!fileOperations || !fileOperations.length) {
    return [];
  }
  
  console.log('Processing file operations:', fileOperations.length);
  
  const results: FileOpsResult[] = [];
  
  // First, create any directories needed
  const dirOperations = fileOperations.filter(op => 
    (op.operation === 'create' || op.operation === 'mkdir') && 
    (!op.content || op.content === null)
  );
  
  // Process directory operations first
  for (const op of dirOperations) {
    try {
      const pathParts = op.path.split('/').filter(Boolean);
      let currentPath = '';
      
      // Create each directory in the path
      for (const part of pathParts) {
        const nextPath = currentPath + '/' + part;
        
        // Check if folder already exists
        const existingFolder = fileSystem.getFileByPath(nextPath);
        
        if (!existingFolder) {
          await fileSystem.createFolder(currentPath === '' ? '/' : currentPath, part);
          console.log(`Created directory: ${nextPath}`);
        }
        
        currentPath = nextPath;
      }
      
      results.push({
        operation: op.operation,
        path: op.path,
        success: true,
      });
    } catch (error) {
      console.error(`Error creating directory ${op.path}:`, error);
      results.push({
        operation: op.operation,
        path: op.path,
        success: false,
        message: error.message
      });
    }
  }
  
  // Process file operations after directories are created
  for (const op of fileOperations) {
    // Skip already processed directory operations
    if (dirOperations.includes(op)) {
      continue;
    }
    
    try {
      switch (op.operation) {
        case 'read':
          const content = fileSystem.getFileContentByPath(op.path);
          results.push({
            operation: 'read',
            path: op.path,
            success: content !== null,
            message: content === null ? 'File not found' : undefined
          });
          break;
          
        case 'write':
          // Fall through to create case for writes to existing files
          // Handle file writes/updates
          if (fileSystem.getFileByPath(op.path)) {
            await fileSystem.updateFileByPath(op.path, op.content || '');
            results.push({
              operation: 'write',
              path: op.path,
              success: true
            });
          } else {
            // For new files, we need to handle path creation first
            const pathParts = op.path.split('/');
            const fileName = pathParts.pop() || '';
            const dirPath = pathParts.join('/') || '/';
            
            await fileSystem.createFile(dirPath, fileName, op.content || '');
            console.log(`Created file: ${op.path}`);
            
            results.push({
              operation: 'create',
              path: op.path,
              success: true
            });
          }
          break;
          
        case 'create':
          if (op.content) {
            // Creating a file with content
            const pathParts = op.path.split('/');
            const fileName = pathParts.pop() || '';
            const dirPath = pathParts.join('/') || '/';
            
            await fileSystem.createFile(dirPath, fileName, op.content);
            console.log(`Created file: ${op.path}`);
            
            results.push({
              operation: 'create',
              path: op.path,
              success: true
            });
          }
          // Directories were already handled above
          break;
          
        case 'delete':
          const fileToDelete = fileSystem.getFileByPath(op.path);
          if (fileToDelete) {
            await fileSystem.deleteFile(fileToDelete.id);
            console.log(`Deleted file/directory: ${op.path}`);
            results.push({
              operation: 'delete',
              path: op.path,
              success: true
            });
          } else {
            results.push({
              operation: 'delete',
              path: op.path,
              success: false,
              message: 'File not found'
            });
          }
          break;
      }
    } catch (error) {
      console.error(`Error processing operation ${op.operation} for ${op.path}:`, error);
      results.push({
        operation: op.operation,
        path: op.path,
        success: false,
        message: error.message
      });
    }
  }
  
  return results;
};

// Get current project structure as a string
export const getProjectStructure = async (fileSystem: FileSystemContextType): Promise<string> => {
  try {
    await fileSystem.refreshFiles();
    const files = fileSystem.fileSystem.files;
    
    if (!files || files.length === 0) {
      return "No files available in the project.";
    }
    
    // Create a tree structure of folders and files
    const rootFolder = { name: '/', type: 'folder', children: [] };
    
    // Function to find or create a folder in the tree
    const findOrCreateFolder = (path: string, currentFolder: any) => {
      if (path === '/' || path === '') {
        return currentFolder;
      }
      
      const parts = path.split('/').filter(Boolean);
      let folder = currentFolder;
      
      for (const part of parts) {
        let found = folder.children.find(item => item.type === 'folder' && item.name === part);
        
        if (!found) {
          found = { name: part, type: 'folder', children: [] };
          folder.children.push(found);
        }
        
        folder = found;
      }
      
      return folder;
    };
    
    // Add all files to the tree
    for (const file of files) {
      if (file.path) {
        const pathParts = file.path.split('/').filter(Boolean);
        const fileName = pathParts.pop();
        const folderPath = '/' + pathParts.join('/');
        const folder = findOrCreateFolder(folderPath, rootFolder);
        
        // Add the file to its folder
        if (file.type === 'folder') {
          // This is handled by findOrCreateFolder
        } else {
          folder.children.push({
            name: fileName,
            type: 'file',
            id: file.id
          });
        }
      }
    }
    
    // Convert the tree to a string representation
    const printTree = (node: any, indent: string = ''): string => {
      let result = '';
      
      if (node.name !== '/') {
        result += `${indent}${node.name}\n`;
        indent += '  ';
      }
      
      // Sort children: folders first, then files
      const sortedChildren = [...node.children].sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'folder' ? -1 : 1;
      });
      
      for (const child of sortedChildren) {
        if (child.type === 'folder') {
          result += printTree(child, indent);
        } else {
          result += `${indent}${child.name}\n`;
        }
      }
      
      return result;
    };
    
    return printTree(rootFolder);
    
  } catch (error) {
    console.error('Error generating project structure:', error);
    return "Error retrieving project structure.";
  }
};
