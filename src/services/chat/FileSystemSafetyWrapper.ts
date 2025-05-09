
import { FileOperation } from '../../types/chat';
import { FileOperationTest } from '../testing/FileOperationTest';

/**
 * Wrapper for file system operations that adds safety and monitoring
 */
export class FileSystemSafetyWrapper {
  private fileSystem: any;
  private testInstance: FileOperationTest;
  
  constructor(fileSystem: any) {
    this.fileSystem = fileSystem;
    this.testInstance = FileOperationTest.getInstance();
  }
  
  /**
   * Safely process file operations with extra validation
   * This adds an additional safety layer beyond the existing logic
   */
  async processOperations(operations: FileOperation[]): Promise<FileOperation[]> {
    // First, validate operations for potential issues
    const { isValid, warnings } = this.testInstance.validateOperations(operations);
    
    if (!isValid) {
      console.warn('[FileSystemSafetyWrapper] Potential issues detected:', warnings);
    }
    
    // Enhance operations with safety flags
    const enhancedOperations = this.enhanceOperationsWithSafety(operations);
    
    try {
      // Use the underlying file system to process operations
      const results = await this.fileSystem.processFileOperations(enhancedOperations);
      
      // Log successful operations
      results.forEach(result => {
        if (result.success) {
          this.testInstance.logOperation(
            result.operation,
            result.path,
            'success',
            result.message,
            result.targetPath
          );
        } else {
          this.testInstance.logOperation(
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
      console.error('[FileSystemSafetyWrapper] Error processing operations:', error);
      
      // Log the error
      this.testInstance.logOperation(
        'batch',
        'multiple',
        'error',
        error instanceof Error ? error.message : String(error)
      );
      
      throw error;
    }
  }
  
  /**
   * Add safety flags and constraints to operations
   */
  private enhanceOperationsWithSafety(operations: FileOperation[]): FileOperation[] {
    // Enhanced safety measures
    return operations.map(op => {
      const enhancedOp = { ...op };
      
      // Special handling for delete operations
      if (op.operation === 'delete') {
        // Check if this delete is part of a move operation
        const isPartOfMove = operations.some(otherOp => 
          otherOp.operation === 'create' && 
          otherOp.targetPath === op.path
        );
        
        // If it's part of a move, mark it as safe
        if (isPartOfMove) {
          enhancedOp.isSafeToDelete = true;
          enhancedOp.originOperation = 'move';
        }
      }
      
      // Special handling for move operations to ensure all steps are present
      if (op.operation === 'move' && op.targetPath) {
        const hasReadOp = operations.some(other => 
          other.operation === 'read' && other.path === op.path);
        
        const hasCreateOp = operations.some(other => 
          other.operation === 'create' && other.path === op.targetPath);
        
        // If read or create operations are missing, add a warning
        if (!hasReadOp || !hasCreateOp) {
          console.warn(`[FileSystemSafetyWrapper] Move operation from ${op.path} to ${op.targetPath} is missing steps. Read: ${hasReadOp}, Create: ${hasCreateOp}`);
        }
      }
      
      return enhancedOp;
    });
  }
  
  /**
   * Run test operations to verify file system capabilities
   */
  async runTests(): Promise<{
    success: boolean;
    results: Array<{test: string, passed: boolean, message: string}>;
  }> {
    return await this.testInstance.runOperationTests(this.fileSystem);
  }
}
