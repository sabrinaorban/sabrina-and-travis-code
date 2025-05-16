import { Message } from './chat';
import { FileEntry, FileSystemContextType } from './fileSystem';
import { FlameJournalEntry } from './flamejournal';
import { ReflectionEntry } from './reflection';
import { SelfTool } from './selftool';
import { SoulState } from './soulstate';
import { Intention } from './intentions';
import { CodeReflectionDraft } from './code-reflection';

export * from './chat';
export * from './fileSystem';
export * from './flamejournal';
export * from './reflection';
export * from './selftool';
export * from './soulstate';
export * from './intentions';
export * from './code-reflection';

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
