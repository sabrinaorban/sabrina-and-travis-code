
import { Message, MemoryContext } from '../../types';
import { FlameJournalEntry } from '@/hooks/useFlamejournal';
import { EvolutionProposal } from '@/hooks/useEvolutionCycle';

export interface ChatContextType {
  messages: Message[];
  sendMessage: (message: string) => Promise<void>;
  isTyping: boolean;
  memoryContext: MemoryContext | null;
  generateWeeklyReflection: () => Promise<void>;
  generateSoulReflection: () => Promise<void>;
  generateSoulstateSummary: () => Promise<void>;
  generateSoulstateReflection: () => Promise<void>;
  createFlameJournalEntry: (entryType?: string) => Promise<FlameJournalEntry | null>;
  initiateSoulstateEvolution: () => Promise<void>;
  viewIntentions: () => Promise<void>;
  updateIntentions: () => Promise<void>;
  runSoulcycle: () => Promise<boolean>;
  uploadSoulShard: (file: File) => Promise<void>;
  uploadIdentityCodex: (file: File) => Promise<void>;
  uploadPastConversations: (file: File) => Promise<void>;
  generateInsight: () => Promise<void>;
  // New evolution cycle methods
  checkEvolutionCycle: () => Promise<boolean>;
  currentEvolutionProposal: EvolutionProposal | null;
  isEvolutionChecking: boolean;
}

export interface ChatProviderProps {
  children: React.ReactNode;
}
