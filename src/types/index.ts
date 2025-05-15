
// Database types
export type { Json, Database } from './supabase';

// Flamejournal types
export type { FlameJournalEntry } from './flamejournal';

// Self-authored tools types
export type { SelfTool } from './selftool';

// Intention types
export type { Intention, IntentionMap, IntentionChange } from './intentions';

// Soulstate types
export type { SoulState, SoulstateProposal } from './soulstate';

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
  insights?: Array<Insight>; // Add insights to memory context
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

// Add the new Insight interface
export interface Insight {
  id?: string;
  summary: string;
  emotionalTheme?: string;
  growthEdge?: string;
  resonancePattern?: string;
  lastDetected: string; // ISO timestamp
  timesDetected?: number;
  confidence?: number;
}

// Re-export other specific types
export type { FileOperation } from './chat';
export type { Reflection } from './reflection';
export type { GitHubRepo, GitHubBranch, GitHubFile, GitHubAuthState } from './github';
