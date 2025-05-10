
import { FileOperation } from '../../../types/chat';

// Sort operations to ensure proper execution order
export const sortOperations = (operations: FileOperation[]): FileOperation[] => {
  return [...operations].sort((a, b) => {
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
};

// Group operations by type for processing
export const groupOperations = (operations: FileOperation[]) => {
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

// Further separate delete operations
export const separateDeleteOperations = (deleteOperations: FileOperation[]) => {
  return {
    manualDeleteOperations: deleteOperations.filter(op => op.originOperation !== 'move'),
    moveDeleteOperations: deleteOperations.filter(op => op.originOperation === 'move')
  };
};
