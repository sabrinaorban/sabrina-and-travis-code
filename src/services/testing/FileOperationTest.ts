import { FileOperation } from '../../types/chat';
import { useToast } from '@/hooks/use-toast';
import { PROTECTED_FILES } from '../chat/fileOperations/OperationState';

/**
 * Tests and monitors file operations
 * This utility helps detect unwanted file modifications or deletions
 */
export class FileOperationTest {
  private static _instance: FileOperationTest;
  private _protectedPaths: string[] = [...PROTECTED_FILES];
  private _trackingEnabled: boolean = true;
  private _operationsLog: Array<{ 
    operation: string; 
    path: string; 
    targetPath?: string; 
    timestamp: number;
    result: 'success' | 'warning' | 'error';
    message?: string;
  }> = [];
  
  // Singleton pattern
  private constructor() { }
  
  static getInstance(): FileOperationTest {
    if (!FileOperationTest._instance) {
      FileOperationTest._instance = new FileOperationTest();
    }
    return FileOperationTest._instance;
  }
  
  /**
   * Add a path to the protected list
   */
  addProtectedPath(path: string): void {
    if (!this._protectedPaths.includes(path)) {
      this._protectedPaths.push(path);
      console.log(`[FileOperationTest] Added protected path: ${path}`);
    }
  }
  
  /**
   * Remove a path from the protected list
   */
  removeProtectedPath(path: string): void {
    this._protectedPaths = this._protectedPaths.filter(p => p !== path);
    console.log(`[FileOperationTest] Removed protected path: ${path}`);
  }
  
  /**
   * Check if file operations might impact protected files
   */
  validateOperations(operations: FileOperation[]): { 
    isValid: boolean; 
    warnings: Array<{operation: FileOperation, message: string}>
  } {
    const warnings: Array<{operation: FileOperation, message: string}> = [];
    
    if (!this._trackingEnabled) {
      return { isValid: true, warnings };
    }
    
    // Group operations by path for analysis
    const pathOps = new Map<string, FileOperation[]>();
    
    operations.forEach(op => {
      if (!pathOps.has(op.path)) {
        pathOps.set(op.path, []);
      }
      pathOps.get(op.path)!.push(op);
    });
    
    // Check for dangerous or unexpected operations
    operations.forEach(op => {
      // Check for operations on protected paths
      if (op.operation === 'delete' && !op.isSafeToDelete) {
        if (this._protectedPaths.some(p => op.path.startsWith(p) || op.path === p)) {
          warnings.push({
            operation: op,
            message: `Attempting to delete protected path: ${op.path}`
          });
        }
      }
      
      // For move operations, ensure proper sequence (read → create → delete)
      if (op.operation === 'move' || op.originOperation === 'move') {
        const sourcePath = op.path;
        const targetPath = op.targetPath;
        
        if (targetPath) {
          const hasRead = operations.some(o => o.operation === 'read' && o.path === sourcePath);
          const hasCreate = operations.some(o => o.operation === 'create' && o.path === targetPath);
          
          if (!hasRead) {
            warnings.push({
              operation: op,
              message: `Move operation missing read step for: ${sourcePath}`
            });
          }
          
          if (!hasCreate) {
            warnings.push({
              operation: op,
              message: `Move operation missing create step for: ${targetPath}`
            });
          }
        }
      }
    });
    
    // Special check for potential structure damage - detect if we're possibly deleting folders with content
    const potentialFolderDeletions = operations.filter(op => 
      op.operation === 'delete' && !op.path.includes('.')
    );
    
    potentialFolderDeletions.forEach(folderOp => {
      const affectedPaths = operations.filter(op =>
        op.path !== folderOp.path && 
        op.path.startsWith(folderOp.path) && 
        op.operation !== 'delete'
      );
      
      if (affectedPaths.length > 0) {
        warnings.push({
          operation: folderOp,
          message: `Potential folder deletion with active content: ${folderOp.path} affects ${affectedPaths.length} paths`
        });
      }
    });
    
    return {
      isValid: warnings.length === 0,
      warnings
    };
  }
  
  /**
   * Log an operation for tracking
   */
  logOperation(
    operation: string,
    path: string,
    result: 'success' | 'warning' | 'error',
    message?: string,
    targetPath?: string
  ): void {
    this._operationsLog.push({
      operation,
      path,
      targetPath,
      result,
      message,
      timestamp: Date.now()
    });
    
    // Keep log size reasonable
    if (this._operationsLog.length > 1000) {
      this._operationsLog = this._operationsLog.slice(-500);
    }
    
    // Log to console for debugging
    const logMethod = result === 'error' ? console.error : 
                     result === 'warning' ? console.warn : 
                     console.log;
    
    logMethod(`[FileOperation] ${operation} ${path}${targetPath ? ' → ' + targetPath : ''}: ${message || result}`);
  }
  
  /**
   * Clear the operations log
   */
  clearLog(): void {
    this._operationsLog = [];
  }
  
  /**
   * Get the operations log
   */
  getLog(): Array<{ 
    operation: string; 
    path: string; 
    targetPath?: string; 
    timestamp: number;
    result: 'success' | 'warning' | 'error';
    message?: string;
  }> {
    return [...this._operationsLog];
  }
  
  /**
   * Enable or disable tracking
   */
  setTracking(enabled: boolean): void {
    this._trackingEnabled = enabled;
    console.log(`[FileOperationTest] Tracking ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Test if the file system operations are working correctly
   */
  async runOperationTests(fileSystem: any): Promise<{
    success: boolean;
    results: Array<{test: string, passed: boolean, message: string}>
  }> {
    const results: Array<{test: string, passed: boolean, message: string}> = [];
    let allPassed = true;
    
    try {
      // Test 1: Create a test folder
      const testFolder = '/_test_folder_' + Date.now();
      await fileSystem.createFolder('/', testFolder.substring(1));
      
      const folderTest = fileSystem.getFileByPath(testFolder);
      results.push({
        test: 'Create Folder',
        passed: !!folderTest && folderTest.type === 'folder',
        message: folderTest ? 'Successfully created test folder' : 'Failed to create test folder'
      });
      
      if (!folderTest) allPassed = false;
      
      // Test 2: Create a test file
      const testFileName = 'test-file.txt';
      const testFilePath = `${testFolder}/${testFileName}`;
      const testFileContent = 'This is a test file for file system operations ' + Date.now();
      
      await fileSystem.createFile(testFolder, testFileName, testFileContent);
      
      const fileTest = fileSystem.getFileByPath(testFilePath);
      const fileContent = fileSystem.getFileContentByPath(testFilePath);
      
      results.push({
        test: 'Create File',
        passed: !!fileTest && fileTest.type === 'file',
        message: fileTest ? 'Successfully created test file' : 'Failed to create test file'
      });
      
      results.push({
        test: 'File Content',
        passed: fileContent === testFileContent,
        message: fileContent === testFileContent ? 
          'File content matches' : 
          'File content does not match'
      });
      
      if (!fileTest || fileContent !== testFileContent) allPassed = false;
      
      // Test 3: Update file content
      const updatedContent = 'Updated test file content ' + Date.now();
      await fileSystem.updateFileByPath(testFilePath, updatedContent);
      
      const updatedFileContent = fileSystem.getFileContentByPath(testFilePath);
      
      results.push({
        test: 'Update File',
        passed: updatedFileContent === updatedContent,
        message: updatedFileContent === updatedContent ? 
          'Successfully updated file content' : 
          'Failed to update file content'
      });
      
      if (updatedFileContent !== updatedContent) allPassed = false;
      
      // Test 4: Create a second folder for move operations
      const testFolder2 = '/_test_folder2_' + Date.now();
      await fileSystem.createFolder('/', testFolder2.substring(1));
      
      const folder2Test = fileSystem.getFileByPath(testFolder2);
      results.push({
        test: 'Create Second Folder',
        passed: !!folder2Test && folder2Test.type === 'folder',
        message: folder2Test ? 'Successfully created second test folder' : 'Failed to create second test folder'
      });
      
      if (!folder2Test) allPassed = false;
      
      // Test 5: Move a file (read, create, delete sequence)
      const movedFilePath = `${testFolder2}/${testFileName}`;
      
      // Read original content
      const contentToMove = fileSystem.getFileContentByPath(testFilePath);
      
      // Create file at new location
      await fileSystem.createFile(testFolder2, testFileName, contentToMove || '');
      
      // Verify the file was created at new location
      const newLocationFile = fileSystem.getFileByPath(movedFilePath);
      const newLocationContent = fileSystem.getFileContentByPath(movedFilePath);
      
      results.push({
        test: 'Move File - Create Step',
        passed: !!newLocationFile && newLocationFile.type === 'file' && newLocationContent === contentToMove,
        message: newLocationFile && newLocationContent === contentToMove ? 
          'Successfully created file at new location with correct content' : 
          'Failed to create file at new location correctly'
      });
      
      // Delete original file only if new location file exists
      if (newLocationFile) {
        const originalFile = fileSystem.getFileByPath(testFilePath);
        if (originalFile) {
          await fileSystem.deleteFile(originalFile.id);
        }
        
        // Verify original file is gone
        const originalFileAfterDelete = fileSystem.getFileByPath(testFilePath);
        
        results.push({
          test: 'Move File - Delete Original',
          passed: !originalFileAfterDelete,
          message: !originalFileAfterDelete ? 
            'Successfully deleted file from original location' : 
            'Failed to delete file from original location'
        });
      }
      
      // Test 6: Clean up test folders (delete them)
      // First delete the moved file
      const fileToDelete = fileSystem.getFileByPath(movedFilePath);
      if (fileToDelete) {
        await fileSystem.deleteFile(fileToDelete.id);
      }
      
      // Then delete folders
      const folder1 = fileSystem.getFileByPath(testFolder);
      const folder2 = fileSystem.getFileByPath(testFolder2);
      
      if (folder1) {
        await fileSystem.deleteFile(folder1.id);
      }
      
      if (folder2) {
        await fileSystem.deleteFile(folder2.id);
      }
      
      // Verify cleanup
      const folder1AfterDelete = fileSystem.getFileByPath(testFolder);
      const folder2AfterDelete = fileSystem.getFileByPath(testFolder2);
      
      results.push({
        test: 'Delete Test Folders',
        passed: !folder1AfterDelete && !folder2AfterDelete,
        message: !folder1AfterDelete && !folder2AfterDelete ? 
          'Successfully cleaned up test folders' : 
          'Failed to clean up test folders properly'
      });
    } catch (error) {
      console.error('[FileOperationTest] Test error:', error);
      results.push({
        test: 'Exception',
        passed: false,
        message: `Test failed with error: ${error instanceof Error ? error.message : String(error)}`
      });
      allPassed = false;
    }
    
    return {
      success: allPassed,
      results
    };
  }
}
