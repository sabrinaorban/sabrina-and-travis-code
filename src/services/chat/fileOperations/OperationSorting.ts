
import { FileOperation } from '../../../types/chat';

// Sort operations in the optimal processing order
export const sortOperations = (operations: FileOperation[]): FileOperation[] => {
  // Define operation type priorities
  const operationPriority: Record<string, number> = {
    'read': 0,
    'checkExists': 1,
    'create': 2,
    'write': 3,
    'move': 4,
    'delete': 5
  };
  
  // Sort operations by their priority
  return [...operations].sort((a, b) => {
    const priorityA = operationPriority[a.operation] || 999;
    const priorityB = operationPriority[b.operation] || 999;
    return priorityA - priorityB;
  });
};

// Group operations by type for easier processing
export const sortGroupOperations = (operations: FileOperation[]): {
  readOperations: FileOperation[],
  checkExistsOperations: FileOperation[],
  folderCreationOperations: FileOperation[],
  fileCreationOperations: FileOperation[],
  writeOperations: FileOperation[],
  moveOperations: FileOperation[],
  deleteOperations: FileOperation[]
} => {
  const readOperations: FileOperation[] = [];
  const checkExistsOperations: FileOperation[] = [];
  const folderCreationOperations: FileOperation[] = [];
  const fileCreationOperations: FileOperation[] = [];
  const writeOperations: FileOperation[] = [];
  const moveOperations: FileOperation[] = [];
  const deleteOperations: FileOperation[] = [];
  
  operations.forEach(operation => {
    switch (operation.operation) {
      case 'read':
        readOperations.push(operation);
        break;
      
      case 'checkExists':
        checkExistsOperations.push(operation);
        break;
        
      case 'create':
        // Separate folder and file creations
        if (operation.content === null) {
          folderCreationOperations.push(operation);
        } else {
          fileCreationOperations.push(operation);
        }
        break;
        
      case 'write':
        writeOperations.push(operation);
        break;
        
      case 'move':
        moveOperations.push(operation);
        break;
        
      case 'delete':
        deleteOperations.push(operation);
        break;
    }
  });
  
  return {
    readOperations,
    checkExistsOperations,
    folderCreationOperations,
    fileCreationOperations,
    writeOperations,
    moveOperations,
    deleteOperations
  };
};

// Separate delete operations into move-related and manual deletes
export const sortSeparateDeleteOperations = (operations: FileOperation[]): {
  moveDeleteOperations: FileOperation[],
  manualDeleteOperations: FileOperation[]
} => {
  const moveDeleteOperations: FileOperation[] = [];
  const manualDeleteOperations: FileOperation[] = [];
  
  operations.forEach(operation => {
    if (operation.originOperation === 'move') {
      moveDeleteOperations.push(operation);
    } else {
      manualDeleteOperations.push(operation);
    }
  });
  
  return {
    moveDeleteOperations,
    manualDeleteOperations
  };
};
