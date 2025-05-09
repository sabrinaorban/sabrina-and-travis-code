
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

// Special files that should never be deleted without explicit instruction
const PROTECTED_FILES = ['/index.html', '/style.css', '/script.js', '/main.js', '/app.js'];

// Track state of operations to prevent accidental deletions
const operationState = {
  createdFiles: new Map<string, string>(), // path -> fileId
  readFiles: new Map<string, string>(), // path -> content
  safeToDeleteFiles: new Set<string>(), // Files explicitly marked safe to delete
  fileIdMap: new Map<string, string>() // path -> fileId - to preserve file identity
};

// Reset operation state between each batch of operations
const resetOperationState = () => {
  operationState.createdFiles.clear();
  operationState.readFiles.clear();
  operationState.safeToDeleteFiles.clear();
  operationState.fileIdMap.clear();
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
  
  // Sort operations to ensure proper order:
  // 1. Read operations first
  // 2. Folder creations
  // 3. File creations/writes
  // 4. Moves
  // 5. Deletes last
  const sortedOperations = [...operations].sort((a, b) => {
    // First priority: read operations
    if (a.operation === 'read' && b.operation !== 'read') return -1;
    if (b.operation === 'read' && a.operation !== 'read') return 1;
    
    // Second priority: folder creations
    if (a.operation === 'create' && !a.path.includes('.') && b.operation === 'create' && b.path.includes('.')) return -1;
    if (b.operation === 'create' && !b.path.includes('.') && a.operation === 'create' && a.path.includes('.')) return 1;
    
    // Third priority: file creations
    if (a.operation === 'create' && b.operation === 'delete') return -1;
    if (b.operation === 'create' && a.operation === 'delete') return 1;
    
    // Last priority: delete operations (should come after reads and creates)
    if (a.operation === 'delete' && b.operation !== 'delete') return 1;
    if (b.operation === 'delete' && a.operation !== 'delete') return -1;
    
    return 0;
  });
  
  // STEP 1: First, build a map of all file IDs to prevent accidental deletion
  // Get all files and map their paths to IDs
  const mapAllFilesRecursive = (files: FileEntry[]) => {
    for (const file of files) {
      operationState.fileIdMap.set(file.path, file.id);
      if (file.type === 'folder' && file.children) {
        mapAllFilesRecursive(file.children);
      }
    }
  };
  
  // Create initial mapping of all file IDs
  mapAllFilesRecursive(fileSystem.fileSystem?.files || []);
  
  // STEP 2: Process all read operations to understand the current state
  const readOperations = sortedOperations.filter(op => op.operation === 'read');
  for (const op of readOperations) {
    try {
      console.log(`[FileOperationService] Reading file: ${op.path}`);
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
      // Get the file object to include metadata
      const file = fileSystem.getFileByPath(cleanPath);
      
      // Ensure we track existing file IDs to prevent accidental deletion
      if (file) {
        operationState.fileIdMap.set(cleanPath, file.id);
        console.log(`[FileOperationService] Tracked file ID for ${cleanPath}: ${file.id}`);
      }
      
      const readResult = await fileSystem.getFileContentByPath(cleanPath);
      console.log(`[FileOperationService] Read result for ${cleanPath}:`, readResult ? 'Content received' : 'No content');
      
      // Store read content for potential move operations
      if (readResult) {
        operationState.readFiles.set(cleanPath, readResult);
      }
      
      results.push({
        ...op,
        content: readResult,
        fileInfo: file ? {
          name: file.name,
          path: file.path,
          type: file.type,
          lastModified: file.lastModified
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
  
  // STEP 3: Process folder creation operations first
  const folderCreationOperations = sortedOperations.filter(op => 
    op.operation === 'create' && (op.content === null || op.path.endsWith('/') || !op.path.includes('.'))
  );
  
  for (const op of folderCreationOperations) {
    try {
      console.log(`[FileOperationService] Creating folder: ${op.path}`);
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
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
    } catch (error: any) {
      console.error(`[FileOperationService] Error creating folder ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Folder creation failed'
      });
    }
  }
  
  // STEP 4: Process file creations and writes
  const fileCreationOperations = sortedOperations.filter(op => 
    op.operation === 'create' && op.content !== null && op.path.includes('.') && !op.path.endsWith('/')
  );
  
  for (const op of fileCreationOperations) {
    try {
      console.log(`[FileOperationService] Creating file: ${op.path}`);
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
      // Ensure parent directories exist
      const pathParts = cleanPath.split('/');
      const fileName = pathParts.pop() || '';
      const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
      
      await ensureFolderExists(fileSystem, parentPath);
      
      // Check if file already exists to avoid duplicate creation
      const existingFile = fileSystem.getFileByPath(cleanPath);
      if (existingFile && existingFile.type === 'file') {
        console.log(`[FileOperationService] File already exists: ${cleanPath}, updating it instead`);
        await fileSystem.updateFileByPath(cleanPath, op.content || '');
        
        // Track that this file was updated
        operationState.createdFiles.set(cleanPath, existingFile.id);
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} already existed and was updated`
        });
      } else {
        console.log(`[FileOperationService] Creating new file: ${fileName} in ${parentPath}`);
        const newFile = await fileSystem.createFile(parentPath, fileName, op.content || '');
        
        // If we get a file id back, track it
        if (newFile && newFile.id) {
          operationState.createdFiles.set(cleanPath, newFile.id);
          console.log(`[FileOperationService] Tracked new file ID for ${cleanPath}: ${newFile.id}`);
        }
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} created`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error creating file ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'File creation failed'
      });
    }
  }
  
  // STEP 5: Process write operations
  const writeOperations = sortedOperations.filter(op => op.operation === 'write');
  
  for (const op of writeOperations) {
    try {
      console.log(`[FileOperationService] Writing file: ${op.path}`);
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
      // Ensure parent directories exist
      const pathParts = cleanPath.split('/');
      const fileName = pathParts.pop() || '';
      const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
      
      await ensureFolderExists(fileSystem, parentPath);
      
      // Check if file already exists
      const existingFile = fileSystem.getFileByPath(cleanPath);
      if (existingFile && existingFile.type === 'file') {
        console.log(`[FileOperationService] Updating existing file: ${cleanPath}`);
        await fileSystem.updateFileByPath(cleanPath, op.content || '');
        
        // Update tracked file
        operationState.createdFiles.set(cleanPath, existingFile.id);
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} updated`
        });
      } else {
        // File doesn't exist, create it
        console.log(`[FileOperationService] File doesn't exist, creating: ${fileName} in ${parentPath}`);
        const newFile = await fileSystem.createFile(parentPath, fileName, op.content || '');
        
        // Track the new file
        if (newFile && newFile.id) {
          operationState.createdFiles.set(cleanPath, newFile.id);
        }
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} created because it didn't exist`
        });
      }
    } catch (error: any) {
      console.error(`[FileOperationService] Error writing file ${op.path}:`, error);
      results.push({
        ...op,
        success: false,
        message: error.message || 'Write operation failed'
      });
    }
  }
  
  // STEP 6: Process move operations (special handling)
  const moveOperations = sortedOperations.filter(op => 
    op.operation === 'move' || op.operation === 'copy'
  );
  
  for (const op of moveOperations) {
    try {
      if (!op.targetPath) {
        throw new Error(`${op.operation} operation requires a targetPath`);
      }
      
      const normalizedSourcePath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanSourcePath = normalizedSourcePath.replace(/\/+$/, '');
      
      const normalizedTargetPath = op.targetPath.startsWith('/') ? op.targetPath : `/${op.targetPath}`;
      const cleanTargetPath = normalizedTargetPath.replace(/\/+$/, '');
      
      console.log(`[FileOperationService] ${op.operation} from ${cleanSourcePath} to ${cleanTargetPath}`);
      
      // Check source file exists
      const sourceFile = fileSystem.getFileByPath(cleanSourcePath);
      if (!sourceFile) {
        throw new Error(`Source file not found: ${cleanSourcePath}`);
      }
      
      // Remember the source file ID to preserve identity
      const sourceFileId = sourceFile.id;
      operationState.fileIdMap.set(cleanSourcePath, sourceFileId);
      
      // Get content from read operation cache or read it now
      let content = operationState.readFiles.get(cleanSourcePath);
      if (!content) {
        content = await fileSystem.getFileContentByPath(cleanSourcePath);
        if (content) {
          operationState.readFiles.set(cleanSourcePath, content);
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
      const targetParts = cleanTargetPath.split('/');
      const targetFileName = targetParts.pop() || '';
      const targetParentPath = targetParts.length === 0 ? '/' : `/${targetParts.join('/')}`;
      
      await ensureFolderExists(fileSystem, targetParentPath);
      
      // Create the file at target location  
      console.log(`[FileOperationService] Creating file at target: ${targetFileName} in ${targetParentPath}`);
      const newFile = await fileSystem.createFile(targetParentPath, targetFileName, content);
      
      // Track the new file's ID
      if (newFile && newFile.id) {
        operationState.createdFiles.set(cleanTargetPath, newFile.id);
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
        operationState.safeToDeleteFiles.add(cleanSourcePath);
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
  
  // STEP 7: Process delete operations with enhanced safety checks
  const deleteOperations = sortedOperations.filter(op => op.operation === 'delete');
  const manualDeleteOperations = deleteOperations.filter(op => op.originOperation !== 'move');
  const moveDeleteOperations = deleteOperations.filter(op => op.originOperation === 'move');
  
  // First process move-related deletions
  for (const op of moveDeleteOperations) {
    try {
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
      // Don't delete protected files
      if (PROTECTED_FILES.includes(cleanPath) && !op.isSafeToDelete) {
        console.error(`[FileOperationService] Refusing to delete protected file: ${cleanPath}`);
        results.push({
          ...op,
          success: false,
          message: `Protected file ${cleanPath} cannot be deleted without explicit confirmation`
        });
        continue;
      }
      
      console.log(`[FileOperationService] Processing move-deletion for ${cleanPath}`);
      
      // SAFETY CHECK: Verify that the target file exists before deleting the source
      if (op.targetPath) {
        const targetExists = fileSystem.getFileByPath(op.targetPath);
        if (!targetExists) {
          console.error(`[FileOperationService] Cannot delete ${cleanPath} - target ${op.targetPath} not found`);
          results.push({
            ...op,
            success: false,
            message: `Delete aborted: target file not found at ${op.targetPath}`
          });
          continue;
        }
      }
      
      // Verify this file is marked as safe to delete
      if (!operationState.safeToDeleteFiles.has(cleanPath)) {
        console.error(`[FileOperationService] File ${cleanPath} not marked as safe to delete`);
        results.push({
          ...op,
          success: false,
          message: `Delete aborted: safety check failed for ${cleanPath}`
        });
        continue;
      }
      
      // Get file by path for deletion
      const fileToDelete = fileSystem.getFileByPath(cleanPath);
      if (fileToDelete) {
        console.log(`[FileOperationService] Deleting file after move: ${cleanPath} (ID: ${fileToDelete.id})`);
        await fileSystem.deleteFile(fileToDelete.id);
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} deleted after successful move`
        });
      } else {
        console.log(`[FileOperationService] File not found for deletion: ${cleanPath}`);
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
  
  // Then process manual delete operations
  for (const op of manualDeleteOperations) {
    try {
      const normalizedPath = op.path.startsWith('/') ? op.path : `/${op.path}`;
      const cleanPath = normalizedPath.replace(/\/+$/, '');
      
      // Extra protection for critical files
      if (PROTECTED_FILES.includes(cleanPath)) {
        console.error(`[FileOperationService] Refusing to delete protected file: ${cleanPath}`);
        results.push({
          ...op,
          success: false,
          message: `Protected file ${cleanPath} cannot be deleted`
        });
        continue;
      }
      
      console.log(`[FileOperationService] Processing manual deletion for ${cleanPath}`);
      
      const fileToDelete = fileSystem.getFileByPath(cleanPath);
      if (fileToDelete) {
        console.log(`[FileOperationService] Deleting file: ${cleanPath} (ID: ${fileToDelete.id})`);
        await fileSystem.deleteFile(fileToDelete.id);
        
        results.push({
          ...op,
          success: true,
          message: `File ${cleanPath} deleted`
        });
      } else {
        console.log(`[FileOperationService] File not found for deletion: ${cleanPath}`);
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
