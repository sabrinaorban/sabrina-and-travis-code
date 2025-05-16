
// Import types from individual files
import { Message, FileOperation, OpenAIMessage, Insight } from './chat';
import { FileEntry, FileSystemState, FileSystemContextType } from './fileSystem';
import { FlameJournalEntry } from './flamejournal';
import { ReflectionEntry } from './reflection';
import { SelfTool } from './selftool';
import { SoulState } from './soulstate';
import { Intention } from './intentions';
import { CodeReflectionDraft, CodeReflectionResult } from './code-reflection';
import { User, MemoryEmbedding } from './user';

// Re-export all types
export { Message, FileOperation, OpenAIMessage, Insight } from './chat';
export { FileEntry, FileSystemState, FileSystemContextType } from './fileSystem';
export { FlameJournalEntry } from './flamejournal';
export { ReflectionEntry } from './reflection';
export { SelfTool } from './selftool';
export { SoulState } from './soulstate';
export { Intention } from './intentions';
export { CodeReflectionDraft, CodeReflectionResult } from './code-reflection';
export { User, MemoryEmbedding } from './user';

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
