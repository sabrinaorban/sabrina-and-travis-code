
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
