
import { createNextJsProject } from './ProjectTemplates';
import { ensureFolderExists } from './FolderOperations';

// Handler for file operations
export const handleFileOperation = async (fileSystem: any, operation: any): Promise<boolean> => {
  console.log('[FileOperationHandler] Handling file operation:', operation);
  
  if (!fileSystem) {
    console.error('[FileOperationHandler] File system not available');
    return false;
  }
  
  try {
    switch (operation.type) {
      case 'create_file':
        if (operation.path && operation.name && operation.content !== undefined) {
          await fileSystem.createFile(operation.path, operation.name, operation.content);
          return true;
        }
        break;
      
      case 'create_folder':
        if (operation.path && operation.name) {
          await fileSystem.createFolder(operation.path, operation.name);
          return true;
        }
        break;
        
      case 'update_file':
        if (operation.path && operation.content !== undefined) {
          await fileSystem.updateFileByPath(operation.path, operation.content);
          return true;
        }
        break;
        
      case 'delete_file':
        if (operation.path) {
          const file = fileSystem.getFileByPath(operation.path);
          if (file) {
            await fileSystem.deleteFile(file.id);
            return true;
          }
        }
        break;
        
      case 'create_project':
        if (operation.template === 'nextjs') {
          return await createNextJsProject(fileSystem);
        }
        break;
        
      default:
        console.error('[FileOperationHandler] Unknown operation type:', operation.type);
        return false;
    }
    
    console.error('[FileOperationHandler] Invalid operation parameters:', operation);
    return false;
  } catch (error) {
    console.error('[FileOperationHandler] Error handling file operation:', error);
    return false;
  }
};
