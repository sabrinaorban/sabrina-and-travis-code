
export interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'delete' | 'move' | 'checkExists';
  path: string;
  content?: string;
  targetPath?: string;  // For move/copy operations
  success?: boolean;
  message?: string;
  fileInfo?: {
    name: string;
    path: string;
    type: string;
    lastModified?: string;
  };
  // New property to track which specific operation requested this deletion
  originOperation?: string;
  // Flag to prevent deletion of unrelated files
  isSafeToDelete?: boolean;
  // Track source file for move operations
  sourceFile?: string;
  // Preserve file history
  preserveFileId?: string;
  // Confirmation properties
  requiresConfirmation?: boolean;
  isConfirmed?: boolean;
}
