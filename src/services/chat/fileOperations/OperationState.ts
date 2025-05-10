
export const PROTECTED_FILES = [
  '/index.html',
  '/style.css',
  '/package.json',
  '/tsconfig.json',
  '/vite.config.js',
  '/index.js',
  '/main.js'
];

// State for tracking operations during a batch processing
export interface OperationState {
  // Map of file path to file ID
  fileIds: Map<string, string>;
  
  // Map of created file paths to their IDs
  createdFiles: Map<string, string>;
  
  // Set of file paths marked as safe to delete
  safeToDeleteFiles: Set<string>;
  
  // Map of path to type ('file' or 'folder') for items that exist
  existingPaths: Map<string, string>;
  
  // File cache for read operations
  fileContentCache: Map<string, string>;
  
  // Map for storing file IDs for operations
  fileIdMap: Map<string, string>;
  
  // Cache for read file contents
  readFiles: Map<string, string>;
}

// Create a new operation state
export const createOperationState = (): OperationState => ({
  fileIds: new Map<string, string>(),
  createdFiles: new Map<string, string>(),
  safeToDeleteFiles: new Set<string>(),
  existingPaths: new Map<string, string>(),
  fileContentCache: new Map<string, string>(),
  fileIdMap: new Map<string, string>(),
  readFiles: new Map<string, string>()
});

// Reset operation state
export const resetOperationState = (state: OperationState): void => {
  state.fileIds.clear();
  state.createdFiles.clear();
  state.safeToDeleteFiles.clear();
  state.existingPaths.clear();
  state.fileContentCache.clear();
  state.fileIdMap.clear();
  state.readFiles.clear();
};

// Map all files recursively to build the fileIds map
export const mapAllFilesRecursive = (files: any[], state: OperationState): void => {
  files.forEach(file => {
    if (file.path && file.id) {
      state.fileIds.set(file.path, file.id);
    }
    
    if (file.type === 'folder' && file.children && Array.isArray(file.children)) {
      mapAllFilesRecursive(file.children, state);
    }
  });
};
