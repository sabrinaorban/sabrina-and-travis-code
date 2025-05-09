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
  isVirtual?: boolean; // Add this property for virtual folders
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

// Add missing types
export interface User {
  id: string;
  name?: string;
  email?: string;
  isAuthenticated: boolean;
}

export interface Message {
  id?: string;
  content: string;
  role: 'user' | 'system' | 'assistant';
  timestamp?: string;
  createdAt?: string;
}

export interface OpenAIMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

