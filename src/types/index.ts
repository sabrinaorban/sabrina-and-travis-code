export interface User {
  id: string;
  name: string;
  email: string;
  isAuthenticated: boolean;
}

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  lastModified?: number;
  children?: FileEntry[];
  github_path?: string;
  github_repo?: string;
  github_branch?: string;
}

export interface FileSystemState {
  files: FileEntry[];
  selectedFile: FileEntry | null;
}
