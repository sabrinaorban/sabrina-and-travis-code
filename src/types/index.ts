
// Database types
export type { Json, Database } from './supabase';

// Flamejournal types
export type { FlameJournalEntry } from './flamejournal';

// Chat and message types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  createdAt?: string;
  emotion?: string | null; // Added emotion field
}

export interface OpenAIMessage {
  role: string;
  content: string;
}

// Memory Context interface
export interface MemoryContext {
  relevantMemories?: Array<{ content: string; similarity: number }>;
  livedMemory?: Array<string>;
  emotionalContext?: string; // Added emotional context
  [key: string]: any;
}

// User types
export interface User {
  id: string;
  name: string;
  email?: string;
  isAuthenticated: boolean;
}

// File system types
export interface FileEntry {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  lastModified?: string;
  children?: FileEntry[];
  isVirtual?: boolean;
  isModified?: boolean;
}

export interface FileSystemState {
  files: FileEntry[];
  selectedFile: FileEntry | null;
}

// Memory embedding types
export interface MemoryEmbedding {
  id: string;
  content: string;
  embedding?: number[];
  message_type: string;
  created_at: string;
  tags?: string[];
  similarity?: number;
}

// Re-export other specific types
export type { FileOperation } from './chat';
export type { Reflection } from './reflection';
export type { SoulState } from './soulstate';
export type { GitHubRepo, GitHubBranch, GitHubFile, GitHubAuthState } from './github';
