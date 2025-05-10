
import { FileOperation } from '../../types/chat';
import { 
  createOperationState, 
  resetOperationState, 
  mapAllFilesRecursive,
  sortOperations,
  processReadOperations,
  processCheckExistsOperations,
  processFolderCreationOperations,
  processFileCreationOperations,
  processWriteOperations,
  processMoveOperations,
  processMoveDeleteOperations,
  processManualDeleteOperations
} from './fileOperations';

import { logFileOperation } from './index';

// Process file operations with monitoring and safety checks
export const processFileOperations = async (
  fileSystem: any,
  operations: FileOperation[]
): Promise<FileOperation[]> => {
  // Skip if no operations or fileSystem
  if (!operations || !operations.length || !fileSystem) {
    console.log('[FileOperationService] No operations to process or no fileSystem');
    return [];
  }

  // Get current file structure state
  const fileStructure = await getProjectStructure(fileSystem);
  console.log(`[FileOperationService] Processing ${operations.length} file operations`);

  // Create operation state for tracking file relationships
  const operationState = createOperationState();
  
  // Populate fileIds map from current file structure - essential for safety
  if (fileStructure) {
    mapAllFilesRecursive(fileStructure, operationState);
  }

  // Remove duplicates if specified in operations
  const deduplicatedOps = operations.some(op => op.duplicateCheck) 
    ? deduplicateOperations(operations)
    : operations;
    
  if (deduplicatedOps.length < operations.length) {
    console.log(`[FileOperationService] Removed ${operations.length - deduplicatedOps.length} duplicate operations`);
  }

  try {
    // Sort operations for safety and dependencies
    const sortedOperations = sortOperations(deduplicatedOps);
    console.log(`[FileOperationService] Sorted ${sortedOperations.length} operations`);

    const readResults = await processReadOperations(fileSystem, 
      sortedOperations.filter(op => op.operation === 'read'), operationState);
      
    const checkResults = await processCheckExistsOperations(fileSystem,
      sortedOperations.filter(op => op.operation === 'checkExists'), operationState);
      
    const folderResults = await processFolderCreationOperations(fileSystem,
      sortedOperations.filter(op => op.operation === 'create' && op.path.endsWith('/')), operationState);
      
    const createResults = await processFileCreationOperations(fileSystem,
      sortedOperations.filter(op => op.operation === 'create' && !op.path.endsWith('/')), operationState);
      
    const writeResults = await processWriteOperations(fileSystem,
      sortedOperations.filter(op => op.operation === 'write'), operationState);
      
    const moveResults = await processMoveOperations(fileSystem,
      sortedOperations.filter(op => op.operation === 'move'), operationState);
      
    // Delete operations related to moves first (safe)
    const moveDeleteResults = await processMoveDeleteOperations(fileSystem,
      sortedOperations.filter(op => op.operation === 'delete' && op.originOperation === 'move'), operationState);
      
    // Manual delete operations last (require safety checks)
    const deleteResults = await processManualDeleteOperations(fileSystem,
      sortedOperations.filter(op => op.operation === 'delete' && op.originOperation !== 'move'), operationState);
      
    // Combine all results for the response
    const allResults = [
      ...readResults,
      ...checkResults,
      ...folderResults,
      ...createResults,
      ...writeResults,
      ...moveResults,
      ...moveDeleteResults,
      ...deleteResults
    ];
    
    console.log(`[FileOperationService] Completed ${allResults.length} operations of ${sortedOperations.length} requested`);
    
    const successCount = allResults.filter(op => op.success).length;
    const failureCount = allResults.filter(op => op.success === false).length;
    
    console.log(`[FileOperationService] Operation summary: ${successCount} succeeded, ${failureCount} failed`);
    
    // Reset operation state for cleanup
    resetOperationState(operationState);
    
    return allResults;
  } catch (error) {
    console.error('[FileOperationService] Error processing operations:', error);
    // Reset operation state in case of error
    resetOperationState(operationState);
    throw error;
  }
};

// Get the project structure
export const getProjectStructure = async (fileSystem: any): Promise<any> => {
  if (!fileSystem || !fileSystem.files) {
    console.error('[FileOperationService] fileSystem or fileSystem.files not available');
    return null;
  }
  
  // Copy the structure to avoid mutations
  return JSON.parse(JSON.stringify(fileSystem.files));
};

// Deduplicate operations based on path and operation type
const deduplicateOperations = (operations: FileOperation[]): FileOperation[] => {
  const seen = new Map<string, FileOperation>();
  
  // First pass - prioritize specific operations
  operations.forEach(op => {
    const key = `${op.operation}:${op.path}`;
    
    // If we haven't seen this operation before, or this is a more specific one
    if (!seen.has(key) || 
        (op.operation === 'create' && op.content) || 
        op.isConfirmed) {
      seen.set(key, op);
    }
  });
  
  return Array.from(seen.values());
};
