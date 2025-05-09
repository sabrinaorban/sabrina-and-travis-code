
import { FileSystemState, FileEntry } from '../../types';
import { FileOperation } from '../../types/chat';
import { ensureFolderExists } from '../utils/FileSystemUtils';

// Get project structure as a formatted string with file paths and content hints
export const getProjectStructure = async (fileSystem: any): Promise<string> => {
  if (!fileSystem || !fileSystem.fileSystem) {
    return 'No files available';
  }
  
  // Format project structure as a string with file paths
  const formatStructure = (files: FileEntry[] | undefined, indent = '') => {
    if (!files || files.length === 0) {
      return '';
    }
    
    let structure = '';
    files.forEach((file) => {
      // Include path explicitly for easier reference
      structure += `${indent}${file.path} (${file.type})\n`;
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

// Track state of operations to prevent accidental deletions
const operationState = {
  createdFiles: new Set<string>(),
  readFiles: new Map<string, string>(),
  // Add a set to track specifically which files should be deleted
  safeToDeleteFiles: new Set<string>()
};

// Reset operation state between each batch of operations
const resetOperationState = () => {
  operationState.createdFiles.clear();
  operationState.readFiles.clear();
  operationState.safeToDeleteFiles.clear();
};

// Process file operations with improved handling of file moves and copies
export const processFileOperations = async (
  fileSystem: any,
  operations: FileOperation[]
): Promise<FileOperation[]> => {
  console.log('[FileOperationService] Starting to process operations:', operations.length);
  
  if (!fileSystem) {
    console.error('[FileOperationService] File system is not available');
    return [];
  }
  
  if (!operations || operations.length === 0) {
    console.log('[FileOperationService] No operations to process');
    return [];
  }
  
  // Reset operation state for this batch
  resetOperationState();
  
  const results: FileOperation[] = [];
  
  // First, sort operations to ensure proper order (read first, create, then delete)
  const sortedOperations = [...operations].sort((a, b) => {
    // First priority: read operations
    if (a.operation === 'read' && b.operation !== 'read') return -1;
    if (b.operation === 'read' && a.operation !== 'read') return 1;
    
    // Second priority: folder creations
    if (a.operation === 'create' && !a.path.includes('.') && b.operation === 'create' && b.path.includes('.')) return -1;
    if (b.operation === 'create' && !b.path.includes('.') && a.operation === 'create' && a.path.includes('.')) return 1;
    
    // Last priority: delete operations (should come after reads and creates)
    if (a.operation === 'delete' && b.operation !== 'delete') return 1;
    if (b.operation === 'delete' && a.operation !== 'delete') return -1;
    
    return 0;
  });
  
  // STEP 1: First, do all read operations to understand the current state
  const readOperations = sortedOperations.filter(op => op.operation === 'read');
  for (const op of readOperations) {
    try {
      console.log(`[FileOperationService] Reading file: ${op.path}`);
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
      const readResult = await fileSystem.getFileContentByPath(cleanPath);
      console.log(`[FileOperationService] Read result for ${cleanPath}:`, readResult ? 'Content received' : 'No content');
      
      // Store read content for potential move operations
      if (readResult) {
        operationState.readFiles.set(cleanPath, readResult);
      }
      
      // Get the file object to include metadata
      const fileInfo = fileSystem.getFileByPath(cleanPath);
      
      results.push({
        ...op,
        content: readResult,
        fileInfo: fileInfo ? {
          name: fileInfo.name,
          path: fileInfo.path,
          type: fileInfo.type,
          lastModified: fileInfo.lastModified
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
  
  // STEP 2: Process create and write operations
  const createWriteOperations = sortedOperations.filter(op => 
    op.operation === 'create' || op.operation === 'write' || op.operation === 'move' || op.operation === 'copy'
  );
  
  for (const op of createWriteOperations) {
    try {
      console.log(`[FileOperationService] Processing ${op.operation} operation on path: ${op.path}`);
      
      // Normalize path: ensure it starts with / and remove trailing slashes
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
      console.log(`[FileOperationService] Normalized path: ${cleanPath}`);
      
      // Check if fileSystem methods exist
      if (!fileSystem.createFile || !fileSystem.createFolder || !fileSystem.updateFileByPath || !fileSystem.getFileByPath) {
        console.error('[FileOperationService] File system methods are missing or incomplete');
        throw new Error('File system methods are incomplete');
      }
      
      // Ensure parent directories exist for any file operation
      if (op.operation === 'create' || op.operation === 'write' || op.operation === 'move' || op.operation === 'copy') {
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
        case 'write':
          console.log(`[FileOperationService] Writing file: ${cleanPath}, content length: ${(op.content || '').length}`);
          const fileExists = fileSystem.getFileByPath(cleanPath);
          
          if (fileExists) {
            await fileSystem.updateFileByPath(cleanPath, op.content || '');
            console.log(`[FileOperationService] File updated: ${cleanPath}`);
          } else {
            // Handle case where file doesn't exist - create it
            const pathParts = cleanPath.split('/');
            const fileName = pathParts.pop() || '';
            const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
            
            console.log(`[FileOperationService] Creating file: ${fileName} in ${parentPath}`);
            await fileSystem.createFile(parentPath, fileName, op.content || '');
            console.log(`[FileOperationService] New file created: ${cleanPath}`);
          }
          
          // Track successful file creation/update
          operationState.createdFiles.add(cleanPath);
          
          results.push({
            ...op,
            success: true,
            message: fileExists ? `File ${cleanPath} updated` : `File ${cleanPath} created`
          });
          break;
        
        case 'create':
          if (op.content === null || cleanPath.endsWith('/') || !cleanPath.includes('.')) {
            // It's a folder
            const pathWithoutTrailingSlash = cleanPath.replace(/\/$/, '');
            const pathParts = pathWithoutTrailingSlash.split('/').filter(Boolean);
            const folderName = pathParts.pop() || '';
            const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
            
            // Check if folder already exists to avoid errors
            const folderExists = fileSystem.getFileByPath(pathWithoutTrailingSlash);
            if (folderExists && folderExists.type === 'folder') {
              console.log(`[FileOperationService] Folder already exists: ${pathWithoutTrailingSlash}`);
              results.push({
                ...op,
                success: true,
                message: `Folder ${cleanPath} already exists`
              });
            } else {
              console.log(`[FileOperationService] Creating folder: ${folderName} in ${parentPath}`);
              await fileSystem.createFolder(parentPath, folderName);
              console.log(`[FileOperationService] Folder creation completed`);
              
              results.push({
                ...op,
                success: true,
                message: `Folder ${cleanPath} created`
              });
            }
          } else {
            // It's a file
            const pathParts = cleanPath.split('/');
            const fileName = pathParts.pop() || '';
            const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
            
            // Check if file already exists to avoid duplicate creation
            const fileExists = fileSystem.getFileByPath(cleanPath);
            if (fileExists && fileExists.type === 'file') {
              console.log(`[FileOperationService] File already exists: ${cleanPath}, updating it instead`);
              await fileSystem.updateFileByPath(cleanPath, op.content || '');
              
              results.push({
                ...op,
                success: true,
                message: `File ${cleanPath} already existed and was updated`
              });
            } else {
              console.log(`[FileOperationService] Creating file: ${fileName} in ${parentPath} with content length: ${(op.content || '').length}`);
              await fileSystem.createFile(parentPath, fileName, op.content || '');
              console.log(`[FileOperationService] File creation completed`);
              
              // Track successful file creation
              operationState.createdFiles.add(cleanPath);
              
              results.push({
                ...op,
                success: true,
                message: `File ${cleanPath} created`
              });
            }
          }
          break;
          
        case 'move':
        case 'copy':
          // Implement move and copy operations as a combination of read, create, and delete
          if (!op.targetPath) {
            throw new Error(`${op.operation} operation requires a targetPath`);
          }
          
          const normalizedTargetPath = op.targetPath.startsWith('/') ? op.targetPath : `/${op.targetPath}`;
          const cleanTargetPath = normalizedTargetPath.replace(/\/+$/, '');
          
          console.log(`[FileOperationService] ${op.operation} from ${cleanPath} to ${cleanTargetPath}`);
          
          // Try to get content from prior read operation or read it now
          let content = operationState.readFiles.get(cleanPath);
          if (!content) {
            content = await fileSystem.getFileContentByPath(cleanPath);
            if (content) {
              operationState.readFiles.set(cleanPath, content);
            }
          }
          
          if (!content && op.content) {
            // Use provided content if available (for convenience)
            content = op.content;
          }
          
          if (!content) {
            throw new Error(`Could not get content for ${op.operation} operation from ${cleanPath}`);
          }
          
          // Create file at target path
          const targetParts = cleanTargetPath.split('/');
          const targetFileName = targetParts.pop() || '';
          const targetParentPath = targetParts.length === 0 ? '/' : `/${targetParts.join('/')}`;
          
          // Ensure target parent directory exists
          await ensureFolderExists(fileSystem, targetParentPath);
          
          // Create the file at target location  
          await fileSystem.createFile(targetParentPath, targetFileName, content);
          
          // Track successful file creation
          operationState.createdFiles.add(cleanTargetPath);
          console.log(`[FileOperationService] Successfully created file at ${cleanTargetPath}`);
          
          results.push({
            operation: 'create',
            path: cleanTargetPath,
            content,
            success: true,
            message: `File created at ${cleanTargetPath} as part of ${op.operation} operation`
          });
          
          // For move operations, mark source file as safe to delete only if target was successfully created
          if (op.operation === 'move' && operationState.createdFiles.has(cleanTargetPath)) {
            // Mark this specific file as safe to delete
            operationState.safeToDeleteFiles.add(cleanPath);
            console.log(`[FileOperationService] Marked ${cleanPath} as safe to delete after successful move to ${cleanTargetPath}`);
            
            // Schedule deletion with extra safety properties
            results.push({
              operation: 'delete',
              path: cleanPath,
              targetPath: cleanTargetPath, // Track relationship between source and target
              originOperation: 'move',     // Mark as part of a move operation
              isSafeToDelete: true,        // Flag this file as explicitly safe to delete
              success: true,
              message: `Source file ${cleanPath} scheduled for deletion after successful move to ${cleanTargetPath}`
            });
          }
          break;
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
  
  // STEP 3: Finally process delete operations, but with enhanced safety checks
  const deleteOperations = sortedOperations.filter(op => op.operation === 'delete');
  
  if (deleteOperations.length > 0) {
    console.log(`[FileOperationService] Processing ${deleteOperations.length} delete operations with extra safety`);
    
    for (const op of deleteOperations) {
      try {
        console.log(`[FileOperationService] Deleting file: ${op.path}`);
        const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
        const cleanPath = normalizedPath.replace(/\/+$/, '');
        
        // ENHANCED SAFETY CHECK #1: Is this file marked as safe to delete from a move operation?
        const isSafeToDelete = operationState.safeToDeleteFiles.has(cleanPath) || op.isSafeToDelete === true;
        
        // ENHANCED SAFETY CHECK #2: If this is part of a move operation, verify target exists
        if (op.targetPath && op.originOperation === 'move') {
          const targetExists = operationState.createdFiles.has(op.targetPath);
          if (!targetExists) {
            console.error(`[FileOperationService] Cannot delete ${cleanPath} because target ${op.targetPath} was not created successfully`);
            results.push({
              ...op,
              success: false,
              message: `Delete aborted: target file not created successfully for ${cleanPath}`
            });
            continue;
          }
        }
        
        // ENHANCED SAFETY CHECK #3: Only delete if explicitly marked as safe or direct user deletion
        if (!isSafeToDelete && op.originOperation === 'move') {
          console.error(`[FileOperationService] Refusing to delete ${cleanPath} - not marked as safe to delete`);
          results.push({
            ...op,
            success: false,
            message: `Delete aborted: safety check failed for ${cleanPath}`
          });
          continue;
        }
        
        // If all safety checks pass, proceed with deletion
        const file = fileSystem.getFileByPath(cleanPath);
        if (file) {
          console.log(`[FileOperationService] Safety checks passed, deleting file: ${cleanPath} (id: ${file.id})`);
          await fileSystem.deleteFile(file.id);
          console.log(`[FileOperationService] Delete completed for ${cleanPath}`);
          results.push({
            ...op,
            success: true,
            message: `File ${cleanPath} deleted`
          });
        } else {
          console.error(`[FileOperationService] File not found for deletion: ${cleanPath}`);
          results.push({
            ...op,
            success: false,
            message: `File not found at path: ${cleanPath}`
          });
        }
      } catch (error: any) {
        console.error(`[FileOperationService] Error deleting file ${op.path}:`, error);
        results.push({
          ...op,
          success: false,
          message: error.message || 'Delete operation failed'
        });
      }
    }
  }
  
  // Refresh files once at the end for better performance
  try {
    if (fileSystem.refreshFiles && results.some(r => r.success)) {
      console.log(`[FileOperationService] Refreshing files after all operations`);
      await fileSystem.refreshFiles();
    }
  } catch (refreshError) {
    console.error('[FileOperationService] Error refreshing files:', refreshError);
  }
  
  console.log('[FileOperationService] Finished processing operations. Results:', results.length);
  return results;
};
