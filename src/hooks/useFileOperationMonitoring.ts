
import { useCallback, useEffect } from 'react';
import { useToast } from './use-toast';
import { FileOperationTest } from '../services/testing/FileOperationTest';
import { useFileSystem } from '../contexts/FileSystemContext';
import { FileOperation } from '../types/chat';

/**
 * Hook to integrate file operation monitoring into the file system context
 */
export const useFileOperationMonitoring = () => {
  const { toast } = useToast();
  const { fileSystem, refreshFiles } = useFileSystem();
  const fileOpTest = FileOperationTest.getInstance();
  
  // Setup monitoring for file operations
  const monitorFileOperations = useCallback((operations: FileOperation[]): FileOperation[] => {
    // Validate operations for potential issues
    const { isValid, warnings } = fileOpTest.validateOperations(operations);
    
    if (!isValid && warnings.length > 0) {
      console.warn('[FileOperationMonitoring] Detected potential issues:', warnings);
      
      // Group warnings by type
      const deleteWarnings = warnings.filter(w => w.operation.operation === 'delete');
      const moveWarnings = warnings.filter(w => 
        w.operation.operation === 'move' || 
        w.message.includes('move'));
      const structuralWarnings = warnings.filter(w => 
        w.message.includes('structure') || 
        w.message.includes('folder'));
      
      // Show toast for the most critical issue type
      if (deleteWarnings.length > 0) {
        toast({
          title: 'Warning: Protected File Deletion',
          description: `${deleteWarnings.length} protected files may be affected by delete operations.`,
          variant: 'destructive',
        });
      } else if (structuralWarnings.length > 0) {
        toast({
          title: 'Warning: Folder Structure Change',
          description: `Operations may affect folder structure in unexpected ways.`,
          variant: 'destructive',
        });
      } else if (moveWarnings.length > 0) {
        toast({
          title: 'Warning: Incomplete File Move',
          description: `Move operations should use read → create → delete sequence.`,
          variant: 'destructive',
        });
      }
    }
    
    // Enhance operations with safety flags
    return operations.map(op => {
      // Add safety flags for move operations
      if (op.operation === 'move' && op.targetPath) {
        // Check if there are explicit read and create operations
        const hasReadOp = operations.some(o => 
          o.operation === 'read' && o.path === op.path);
        const hasCreateOp = operations.some(o => 
          o.operation === 'create' && o.path === op.targetPath);
        
        if (!hasReadOp || !hasCreateOp) {
          console.warn(
            `[FileOperationMonitoring] Move operation from ${op.path} to ${op.targetPath} ` +
            `is missing required steps. Read: ${hasReadOp}, Create: ${hasCreateOp}`
          );
        }
      }
      
      // Extra protection for delete operations
      if (op.operation === 'delete' && !op.isSafeToDelete) {
        const warningForThisOp = warnings.find(w => 
          w.operation.path === op.path && w.operation.operation === 'delete');
        
        if (warningForThisOp) {
          // Log the warning
          fileOpTest.logOperation(
            'delete-warning',
            op.path,
            'warning',
            warningForThisOp.message
          );
        }
      }
      
      return op;
    });
  }, [toast, fileOpTest]);
  
  return {
    monitorFileOperations
  };
};
