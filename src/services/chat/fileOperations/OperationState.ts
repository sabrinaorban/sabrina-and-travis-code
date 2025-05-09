
import { FileEntry } from '../../../types';

// Track state of operations to prevent accidental deletions
export interface OperationState {
  createdFiles: Map<string, string>; // path -> fileId
  readFiles: Map<string, string>; // path -> content
  safeToDeleteFiles: Set<string>; // Files explicitly marked safe to delete
  fileIdMap: Map<string, string>; // path -> fileId - to preserve file identity
}

// Special files that should never be deleted without explicit instruction
export const PROTECTED_FILES = ['/index.html', '/style.css', '/script.js', '/main.js', '/app.js'];

// Initialize operation state
export const createOperationState = (): OperationState => ({
  createdFiles: new Map<string, string>(),
  readFiles: new Map<string, string>(),
  safeToDeleteFiles: new Set<string>(),
  fileIdMap: new Map<string, string>()
});

// Reset operation state between each batch of operations
export const resetOperationState = (state: OperationState) => {
  state.createdFiles.clear();
  state.readFiles.clear();
  state.safeToDeleteFiles.clear();
  state.fileIdMap.clear();
};

// Map all file IDs to paths to prevent accidental deletion
export const mapAllFilesRecursive = (files: FileEntry[], state: OperationState) => {
  for (const file of files) {
    state.fileIdMap.set(file.path, file.id);
    if (file.type === 'folder' && file.children) {
      mapAllFilesRecursive(file.children, state);
    }
  }
};
