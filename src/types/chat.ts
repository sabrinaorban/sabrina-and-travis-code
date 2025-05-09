export interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'delete';
  path: string;
  content?: string;
  success?: boolean;
  message?: string;
  fileInfo?: {
    name: string;
    path: string;
    type: string;
    lastModified?: string;
  };
}
