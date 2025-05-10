
import { FileOperation } from '../../../types/chat';

// Order operations for safe execution
export const sortOperations = (operations: FileOperation[]): FileOperation[] => {
  // Define operation order for processing
  const operationOrder: { [key: string]: number } = {
    'read': 0,
    'checkExists': 1,
    'create': 2,
    'write': 3,
    'move': 4,
    'delete': 5,
  };

  return [...operations].sort((a, b) => {
    // First sort by operation type
    const aOrder = operationOrder[a.operation] || 99;
    const bOrder = operationOrder[b.operation] || 99;
    return aOrder - bOrder;
  });
};

// Group operations by type
export const sortGroupOperations = (operations: FileOperation[]) => {
  return {
    readOperations: operations.filter(op => op.operation === 'read'),
    checkExistsOperations: operations.filter(op => op.operation === 'checkExists'),
    folderCreationOperations: operations.filter(op => 
      op.operation === 'create' && (op.content === null || op.path.endsWith('/') || !op.path.includes('.'))
    ),
    fileCreationOperations: operations.filter(op => 
      op.operation === 'create' && op.content !== null && op.path.includes('.') && !op.path.endsWith('/')
    ),
    writeOperations: operations.filter(op => op.operation === 'write'),
    moveOperations: operations.filter(op => op.operation === 'move'),
    deleteOperations: operations.filter(op => op.operation === 'delete'),
  };
};

// Separate delete operations between move-related and manual
export const sortSeparateDeleteOperations = (operations: FileOperation[]) => {
  return {
    // Move-related deletions have a specific origin and target
    moveDeleteOperations: operations.filter(op => 
      op.originOperation === 'move' && op.targetPath && op.isSafeToDelete
    ),
    
    // Manual deletions have no specific origin/target
    manualDeleteOperations: operations.filter(op => 
      op.originOperation !== 'move' || !op.targetPath || !op.isSafeToDelete
    ),
  };
};
