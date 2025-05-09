export interface FileEntry {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string | null;
  children?: FileEntry[];
  parent?: FileEntry | null;
  lastModified?: string;
  isModified?: boolean; // Track if file has been modified since last commit
}

export interface FileSystemState {
  files: FileEntry[];
  selectedFile: FileEntry | null;
}

export interface UserProfile {
  name: string;
  email: string;
  preferences: {
    theme: string;
    fontSize: string;
  };
}

export interface Conversation {
  id: string;
  topic: string;
  summary: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  createdAt: string;
}
