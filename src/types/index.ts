
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

// Message types updated to resolve errors
export type MessageRole = 'user' | 'assistant' | 'system' | 'function';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  timestamp?: number; // Added timestamp as optional to support existing code
  userId?: string;
}

export interface OpenAIMessage {
  role: MessageRole;
  content: string;
}
