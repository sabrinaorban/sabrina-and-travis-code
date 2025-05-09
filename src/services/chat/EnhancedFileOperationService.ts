
import { FileSystemState, FileEntry } from '../../types';
import { FileOperation } from '../../types/chat';
import { processFileOperations, getProjectStructure } from './FileOperationService';
import { FileSystemSafetyWrapper } from './FileSystemSafetyWrapper';
import { FileOperationTest } from '../testing/FileOperationTest';

/**
 * Enhanced version of the FileOperationService with extra safety checks and monitoring
 */
export const enhancedProcessFileOperations = async (
  fileSystem: any,
  operations: FileOperation[]
): Promise<FileOperation[]> => {
  console.log('[EnhancedFileOperationService] Processing operations with safety wrapper');
  
  // Initialize the safety wrapper
  const safetyWrapper = new FileSystemSafetyWrapper(fileSystem);
  
  try {
    // Process operations through the safety wrapper
    const results = await safetyWrapper.processOperations(operations);
    return results;
  } catch (error) {
    console.error('[EnhancedFileOperationService] Error processing file operations:', error);
    
    // Create an error result for each operation
    return operations.map(op => ({
      ...op,
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }));
  }
};

/**
 * Analyze file operations for safety
 * This can be called before actually executing operations to check for potential issues
 */
export const analyzeFileOperations = (operations: FileOperation[]): {
  isValid: boolean;
  warnings: Array<{operation: FileOperation, message: string}>;
} => {
  const testInstance = FileOperationTest.getInstance();
  return testInstance.validateOperations(operations);
};

/**
 * Run a comprehensive test of file system capabilities
 */
export const testFileSystemOperations = async (fileSystem: any): Promise<{
  success: boolean;
  results: Array<{test: string, passed: boolean, message: string}>;
}> => {
  const safetyWrapper = new FileSystemSafetyWrapper(fileSystem);
  return await safetyWrapper.runTests();
};

// Re-export the getProjectStructure function for convenience
export { getProjectStructure };
