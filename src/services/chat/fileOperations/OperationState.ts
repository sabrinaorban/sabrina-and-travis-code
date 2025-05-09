
// Represents the state of file operations during processing
export interface OperationState {
  // Map of file paths to their IDs to prevent accidental deletion
  fileIdMap: Map<string, string>;

  // Tracks files that are safely deletable (e.g. as part of move operations)
  safeToDeleteFiles: Set<string>;

  // Cache of file contents read during operations
  readFiles: Map<string, string>;

  // Tracks files created during this batch of operations
  createdFiles: Map<string, string>;

  // Counter to help track operation ordering
  operationCounter: number;
}

// Files that should never be deleted unless explicitly requested
export const PROTECTED_FILES = [
  '/index.html',
  '/style.css',
  '/package.json',
  '/tsconfig.json',
  '/vite.config.js',
  '/vite.config.ts',
  '/README.md'
];

// Create a fresh operation state
export const createOperationState = (): OperationState => ({
  fileIdMap: new Map<string, string>(),
  safeToDeleteFiles: new Set<string>(),
  readFiles: new Map<string, string>(),
  createdFiles: new Map<string, string>(),
  operationCounter: 0
});

// Reset operation state between batches
export const resetOperationState = (state: OperationState): OperationState => {
  state.safeToDeleteFiles.clear();
  state.readFiles.clear();
  state.createdFiles.clear();
  state.operationCounter = 0;
  return state;
};

// Map all files in the file system to their IDs
export const mapAllFilesRecursive = (
  files: any[] | undefined,
  state: OperationState,
  parentPath: string = ''
): void => {
  if (!files || files.length === 0) return;

  files.forEach((file) => {
    if (!file) return;
    
    const path = file.path || `${parentPath}/${file.name}`;
    
    // Add to the map to track all files in the system
    if (file.id) {
      state.fileIdMap.set(path, file.id);
    }
    
    // Recursively map children
    if (file.children && file.children.length > 0) {
      mapAllFilesRecursive(file.children, state, path);
    }
  });
};

// Group operations by type for optimized processing
export const groupOperations = (operations: any[]): {
  readOperations: any[],
  folderCreationOperations: any[],
  fileCreationOperations: any[],
  writeOperations: any[],
  moveOperations: any[],
  deleteOperations: any[]
} => {
  // Initialize groups
  const readOperations: any[] = [];
  const folderCreationOperations: any[] = [];
  const fileCreationOperations: any[] = [];
  const writeOperations: any[] = [];
  const moveOperations: any[] = [];
  const deleteOperations: any[] = [];
  
  operations.forEach((op) => {
    switch (op.operation) {
      case 'read':
        readOperations.push(op);
        break;
      case 'create':
        // Check if this is a folder or file
        if (!op.content) {
          folderCreationOperations.push(op);
        } else {
          fileCreationOperations.push(op);
        }
        break;
      case 'write':
        writeOperations.push(op);
        break;
      case 'move':
      case 'copy':
        moveOperations.push(op);
        break;
      case 'delete':
        deleteOperations.push(op);
        break;
    }
  });
  
  return {
    readOperations,
    folderCreationOperations,
    fileCreationOperations,
    writeOperations,
    moveOperations,
    deleteOperations
  };
};

// Separate delete operations into move-related and manual deletes
export const separateDeleteOperations = (deleteOperations: any[]): {
  moveDeleteOperations: any[],
  manualDeleteOperations: any[]
} => {
  const moveDeleteOperations: any[] = [];
  const manualDeleteOperations: any[] = [];
  
  deleteOperations.forEach((op) => {
    if (op.originOperation === 'move' || op.isSafeToDelete === true) {
      moveDeleteOperations.push(op);
    } else {
      manualDeleteOperations.push(op);
    }
  });
  
  return {
    moveDeleteOperations,
    manualDeleteOperations
  };
};
