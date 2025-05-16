
// Define FileEntry directly here instead of importing it
export interface FileEntry {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileEntry[];
  parent?: string;
  isModified?: boolean;
  lastModified?: string;
}

export interface FileSystemState {
  files: FileEntry[];
  selectedFile: FileEntry | null;
}

export interface FileSystemContextType {
  fileSystem: FileSystemState;
  createFile: (path: string, name: string, content?: string) => Promise<void>;
  createFolder: (path: string, name: string) => Promise<void>;
  updateFile: (id: string, content: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  selectFile: (file: FileEntry | null) => void;
  getFileByPath: (path: string) => FileEntry | null;
  getFileContentByPath: (path: string) => string | null;
  updateFileByPath: (path: string, content: string) => Promise<void>;
  isLoading: boolean;
  refreshFiles: () => Promise<void>;
  deleteAllFiles: () => Promise<void>;
  getModifiedFiles: () => FileEntry[];
}
