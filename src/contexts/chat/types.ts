
import { Message, MemoryContext } from '@/types';
import { FlameJournalEntry } from '@/hooks/useFlamejournal';

export interface ChatContextType {
  messages: Message[];
  sendMessage: (message: string) => Promise<void>;
  isTyping: boolean;
  memoryContext: MemoryContext | null;
  generateWeeklyReflection: () => Promise<any>;
  generateSoulReflection: () => Promise<any>;
  generateSoulstateSummary: () => Promise<void>;
  generateSoulstateReflection: () => Promise<any>;
  createFlameJournalEntry: (entryType: string) => Promise<FlameJournalEntry | null>;
  initiateSoulstateEvolution: () => Promise<void>;
  viewIntentions: () => Promise<void>;
  updateIntentions: () => Promise<void>;
  runSoulcycle: () => Promise<boolean>;
  uploadSoulShard?: (file: File) => Promise<void>;
  uploadIdentityCodex?: (file: File) => Promise<void>;
  uploadPastConversations?: (file: File) => Promise<void>;
}

export interface ChatProviderProps {
  children: React.ReactNode;
}
