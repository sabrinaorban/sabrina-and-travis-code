
import { FileSystemState, FileEntry } from '../../types';
import { FileOperation } from '../../types/chat';
import { ensureFolderExists } from '../utils/FileSystemUtils';
import { 
  createOperationState,
  resetOperationState,
  mapAllFilesRecursive,
  sortOperations,
  sortGroupOperations as groupOperations,
  sortSeparateDeleteOperations as separateDeleteOperations,
  processReadOperations,
  processFolderCreationOperations,
  processFileCreationOperations,
  processWriteOperations,
  processMoveOperations,
  processMoveDeleteOperations,
  processManualDeleteOperations
} from './fileOperations';

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
  
  // Create operation state for this batch
  const operationState = createOperationState();
  
  const results: FileOperation[] = [];
  
  // STEP 1: Sort operations to ensure proper order
  const sortedOperations = sortOperations(operations);
  
  // STEP 2: Build a map of all file IDs to prevent accidental deletion
  // Create initial mapping of all file IDs
  mapAllFilesRecursive(fileSystem.fileSystem?.files || [], operationState);
  
  // STEP 3: Group operations by type
  const {
    readOperations,
    folderCreationOperations,
    fileCreationOperations,
    writeOperations,
    moveOperations,
    deleteOperations
  } = groupOperations(sortedOperations);
  
  // STEP 4: Process all read operations to understand the current state
  const readResults = await processReadOperations(fileSystem, readOperations, operationState);
  results.push(...readResults);
  
  // STEP 5: Process folder creation operations first
  const folderResults = await processFolderCreationOperations(fileSystem, folderCreationOperations, operationState);
  results.push(...folderResults);
  
  // STEP 6: Process file creations and writes
  const fileCreationResults = await processFileCreationOperations(fileSystem, fileCreationOperations, operationState);
  results.push(...fileCreationResults);
  
  // STEP 7: Process write operations
  const writeResults = await processWriteOperations(fileSystem, writeOperations, operationState);
  results.push(...writeResults);
  
  // STEP 8: Process move operations (special handling)
  const moveResults = await processMoveOperations(fileSystem, moveOperations, operationState);
  results.push(...moveResults);
  
  // STEP 9: Process delete operations with enhanced safety checks
  const { moveDeleteOperations, manualDeleteOperations } = separateDeleteOperations(deleteOperations);
  
  // First process move-related deletions
  const moveDeleteResults = await processMoveDeleteOperations(fileSystem, moveDeleteOperations, operationState);
  results.push(...moveDeleteResults);
  
  // Then process manual delete operations
  const manualDeleteResults = await processManualDeleteOperations(fileSystem, manualDeleteOperations, operationState);
  results.push(...manualDeleteResults);
  
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
