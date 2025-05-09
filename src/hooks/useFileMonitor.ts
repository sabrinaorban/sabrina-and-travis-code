
import { useState, useCallback, useEffect } from 'react';
import { FileOperation } from '../types/chat';
import { useToast } from './use-toast';
import { FileOperationTest } from '../services/testing/FileOperationTest';

/**
 * Hook to monitor file operations and provide warnings for potentially dangerous operations
 */
export const useFileMonitor = () => {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(true);
  const fileOpTest = FileOperationTest.getInstance();
  
  // Toggle the monitor
  const toggleMonitor = useCallback(() => {
    const newState = !isActive;
    setIsActive(newState);
    fileOpTest.setTracking(newState);
    
    toast({
      title: `File Monitor ${newState ? 'Enabled' : 'Disabled'}`,
      description: newState 
        ? 'Monitoring file operations to prevent unwanted changes' 
        : 'File operations will not be monitored for safety',
      variant: newState ? 'default' : 'destructive',
    });
  }, [isActive, toast, fileOpTest]);
  
  // Monitor operations before they're executed
  const monitorOperations = useCallback((operations: FileOperation[]): FileOperation[] => {
    if (!isActive) return operations;
    
    const { isValid, warnings } = fileOpTest.validateOperations(operations);
    
    // Show toast warnings for potentially dangerous operations
    if (!isValid && warnings.length > 0) {
      // Group warnings by type for cleaner notification
      const deleteWarnings = warnings.filter(w => w.operation.operation === 'delete' 
        || w.message.includes('delete'));
      const moveWarnings = warnings.filter(w => w.operation.operation === 'move' 
        || w.operation.originOperation === 'move');
      const otherWarnings = warnings.filter(w => 
        !deleteWarnings.includes(w) && !moveWarnings.includes(w));
      
      // Show toasts for different warning types
      if (deleteWarnings.length > 0) {
        toast({
          title: 'Warning: File Deletion Risk',
          description: `Detected ${deleteWarnings.length} risky delete operations. Check console for details.`,
          variant: 'destructive',
          duration: 5000,
        });
      }
      
      if (moveWarnings.length > 0) {
        toast({
          title: 'Warning: Incomplete File Move',
          description: `Detected ${moveWarnings.length} move operations missing steps. Check console for details.`,
          variant: 'destructive',
          duration: 5000,
        });
      }
      
      if (otherWarnings.length > 0) {
        toast({
          title: 'Warning: Potential File Operation Issues',
          description: `Detected ${otherWarnings.length} potential issues with file operations.`,
          variant: 'destructive', 
          duration: 5000,
        });
      }
      
      // Log detailed warnings to console
      console.warn('[FileMonitor] Detected potentially dangerous operations:', warnings);
    }
    
    // Add safety flags to operations as needed
    return operations.map(op => {
      // Identify move operations that need extra safety
      if (op.operation === 'delete' && !op.isSafeToDelete) {
        const matchingWarning = warnings.find(w => 
          w.operation.path === op.path && w.operation.operation === 'delete');
        
        if (matchingWarning) {
          // Log this operation specifically
          fileOpTest.logOperation(
            'delete-warning', 
            op.path, 
            'warning', 
            matchingWarning.message
          );
          
          // We could prevent the delete by modifying the operation here
          // But for now, we'll just log and allow it with warning
          return op;
        }
      }
      
      return op;
    });
  }, [isActive, toast, fileOpTest]);
  
  // Run file system tests
  const runFileOperationTests = useCallback(async (fileSystem: any) => {
    toast({
      title: 'Running File System Tests',
      description: 'Testing file creation, modification, and deletion capabilities...',
      duration: 3000,
    });
    
    try {
      const { success, results } = await fileOpTest.runOperationTests(fileSystem);
      
      // Log test results to console
      console.log('[FileMonitor] Test results:', results);
      
      // Show toast with test results summary
      toast({
        title: success ? 'File System Tests Passed' : 'File System Tests Failed',
        description: `${results.filter(r => r.passed).length}/${results.length} tests passed. See console for details.`,
        variant: success ? 'default' : 'destructive',
        duration: 5000,
      });
      
      // If any tests failed, log details
      const failedTests = results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        console.error('[FileMonitor] Failed tests:', failedTests);
      }
      
      return {
        success,
        results,
      };
    } catch (error) {
      console.error('[FileMonitor] Error running tests:', error);
      
      toast({
        title: 'File System Test Error',
        description: `An error occurred while testing: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
        duration: 5000,
      });
      
      return {
        success: false,
        results: [{
          test: 'Test Execution',
          passed: false,
          message: `Error: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }, [toast, fileOpTest]);
  
  // Log successful operations
  const logSuccessfulOperation = useCallback((operation: string, path: string, message?: string, targetPath?: string) => {
    if (!isActive) return;
    
    fileOpTest.logOperation(operation, path, 'success', message, targetPath);
  }, [isActive, fileOpTest]);
  
  // Log failed operations
  const logFailedOperation = useCallback((operation: string, path: string, error: any, targetPath?: string) => {
    // Always log errors, even if monitoring is disabled
    const errorMessage = error instanceof Error ? error.message : String(error);
    fileOpTest.logOperation(operation, path, 'error', errorMessage, targetPath);
    
    // Show toast for critical errors
    if (isActive) {
      toast({
        title: 'File Operation Failed',
        description: `${operation} operation on ${path} failed: ${errorMessage}`,
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [isActive, toast, fileOpTest]);
  
  return {
    isActive,
    toggleMonitor,
    monitorOperations,
    runFileOperationTests,
    logSuccessfulOperation,
    logFailedOperation,
  };
};
