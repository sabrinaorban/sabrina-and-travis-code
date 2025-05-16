
// Re-export all utility functions from their respective files
export { findNode } from './FileTreeUtils';
export { findNodeById } from './FileTreeUtils'; // Fixed import path
export { ensureFolderExists } from './FolderOperations';
export { createNextJsProject } from './ProjectTemplates';
export { handleFileOperation } from './FileOperationHandler';
export { buildFileTree } from '../utils/fileSystemUtils'; // Fixed path
export { findSimilarFiles, getFileTreeDebugInfo } from '../utils/fileSystemUtils'; // Fixed paths
