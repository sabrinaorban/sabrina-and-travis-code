
// Re-export all utility functions from their respective files
export { findNode } from './FileTreeUtils';
export { findNodeById } from '@/utils/fileSystemUtils'; // Updated import
export { ensureFolderExists } from './FolderOperations';
export { createNextJsProject } from './ProjectTemplates';
export { handleFileOperation } from './FileOperationHandler';
export { buildFileTree } from '@/utils/fileSystemUtils'; // Added export
export { findSimilarFiles, getFileTreeDebugInfo } from '@/utils/fileSystemUtils'; // Added exports
