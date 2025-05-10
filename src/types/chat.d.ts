
export interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'delete' | 'move' | 'checkExists';
  path: string;
  content?: string;
  success?: boolean;
  message?: string;
  originOperation?: string;
  targetPath?: string;
  isSafeToDelete?: boolean;
  requiresConfirmation?: boolean;
  isConfirmed?: boolean;
  preserveFileId?: string; 
  sourceFile?: string;
}
