
// Message types
export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

// File system types
export interface FileEntry {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileEntry[];
  lastModified?: number;
}

export interface FileSystemState {
  files: FileEntry[];
  selectedFile: FileEntry | null;
}

// OpenAI API types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
}

// Context/memory types
export interface Memory {
  conversations: Message[];
  fileHistory: {
    fileId: string;
    action: 'create' | 'update' | 'delete';
    timestamp: number;
  }[];
}

// Auth types
export interface User {
  id: string;
  name: string;
  isAuthenticated: boolean;
}
