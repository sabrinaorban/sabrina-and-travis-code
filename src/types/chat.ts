
export interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'delete' | 'move' | 'copy';
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
}
