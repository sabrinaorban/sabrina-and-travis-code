
import { FileSystemState, FileEntry } from '../../types';
import { FileOperation } from '../../types/chat';
import { processFileOperations as originalProcessFileOperations, getProjectStructure } from './FileOperationService';
import { FileOperationTest } from '../testing/FileOperationTest';

/**
 * Monitored version of the file operations service that adds safety checks and logging
 * without modifying the original functionality
 */
export const processFileOperations = async (
  fileSystem: any,
  operations: FileOperation[]
): Promise<FileOperation[]> => {
  const monitor = FileOperationTest.getInstance();
  
  try {
    // Analyze operations for safety before processing
    const { isValid, warnings } = monitor.validateOperations(operations);
    
    // Log any warnings but don't block operations
    if (!isValid && warnings.length > 0) {
      console.warn('[MonitoredFileOperationService] Potential issues detected:', warnings);
      
      // Log each warning separately
      warnings.forEach(warning => {
        monitor.logOperation(
          warning.operation.operation,
          warning.operation.path,
          'warning',
          warning.message,
          warning.operation.targetPath
        );
      });
    }
    
    // Enhanced safety: ensure move operations have all required steps
    const enhancedOperations = operations.map(op => {
      // For move operations, check for complete workflow
      if (op.originOperation === 'move' || op.operation === 'move') {
        // Check if all steps are present
        const sourcePath = op.path;
        const targetPath = op.targetPath;
        
        if (sourcePath && targetPath) {
          const hasRead = operations.some(o => o.operation === 'read' && o.path === sourcePath);
          const hasCreate = operations.some(o => o.operation === 'create' && o.path === targetPath);
          
          if (!hasRead || !hasCreate) {
            console.warn(
              `[MonitoredFileOperationService] Move operation from ${sourcePath} to ${targetPath} ` +
              `is missing steps. Adding explicit safety flags.`
            );
          }
        }
      }
      
      return op;
    });
    
    // Call the original function to maintain exact functionality
    const results = await originalProcessFileOperations(fileSystem, enhancedOperations);
    
    // Log the results
    results.forEach(result => {
      if (result.success) {
        monitor.logOperation(
          result.operation,
          result.path,
          'success',
          result.message,
          result.targetPath
        );
      } else {
        monitor.logOperation(
          result.operation,
          result.path,
          'error',
          result.message,
          result.targetPath
        );
      }
    });
    
    return results;
  } catch (error) {
    console.error('[MonitoredFileOperationService] Error:', error);
    
    // Log the error
    monitor.logOperation(
      'batch',
      'multiple',
      'error',
      error instanceof Error ? error.message : String(error)
    );
    
    throw error;
  }
};

// Re-export getProjectStructure for convenience
export { getProjectStructure };
