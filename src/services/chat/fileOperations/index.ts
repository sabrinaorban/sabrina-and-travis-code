
// Re-export all file operation modules with explicit naming to avoid conflicts
export * from './PathUtils';
export { 
  createOperationState, 
  resetOperationState, 
  mapAllFilesRecursive, 
  PROTECTED_FILES, 
  type OperationState 
} from './OperationState';
export { 
  sortOperations,
  groupOperations as sortGroupOperations,
  separateDeleteOperations as sortSeparateDeleteOperations
} from './OperationSorter';
export { processReadOperations } from './ReadOperationProcessor';
export { processFolderCreationOperations } from './FolderOperationProcessor';
export { 
  processFileCreationOperations, 
  processWriteOperations 
} from './FileCreationProcessor';
export { processMoveOperations } from './MoveOperationProcessor';
export { 
  processMoveDeleteOperations, 
  processManualDeleteOperations 
} from './DeleteOperationProcessor';
