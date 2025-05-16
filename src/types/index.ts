
// Import types from individual files
import { Message, FileOperation, OpenAIMessage, Insight } from './chat';
import { FileEntry, FileSystemState, FileSystemContextType } from './fileSystem';
import { FlameJournalEntry } from './flamejournal';
// Fix reflection import - assuming it's actually named Reflection in the file
import { Reflection as ReflectionEntry } from './reflection'; 
import { SelfTool } from './selftool';
import { SoulState } from './soulstate';
import { Intention } from './intentions';
import { CodeReflectionDraft, CodeReflectionResult } from './code-reflection';
import { User, MemoryEmbedding } from './user';

// Re-export all types properly using export type for TypeScript isolatedModules mode
export type { Message, FileOperation, OpenAIMessage, Insight } from './chat';
export type { FileEntry, FileSystemState, FileSystemContextType } from './fileSystem';
export type { FlameJournalEntry } from './flamejournal';
export type { Reflection as ReflectionEntry } from './reflection';
export type { SelfTool } from './selftool';
export type { SoulState } from './soulstate';
export type { Intention } from './intentions';
export type { CodeReflectionDraft, CodeReflectionResult } from './code-reflection';
export type { User, MemoryEmbedding } from './user';

export interface MemoryContext {
  userProfile?: any;
  relevantMemories?: any[];
  pastConversations?: any[];
  specialDocuments?: {
    soulShard?: FileEntry;
    identityCodex?: FileEntry;
  };
  livedMemory?: string[];
  insights?: string[];
}

export interface GithubContext {
    isAuthenticated: boolean;
    username?: string;
    currentRepo?: any;
    currentBranch?: string;
}
