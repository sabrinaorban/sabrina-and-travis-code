
import { Message, MemoryContext, Reflection, FlameJournalEntry, SelfTool } from '@/types';

export interface ChatProviderProps {
  children: React.ReactNode;
}

export interface ChatContextType {
  messages: Message[];
  sendMessage: (content: string, memoryContext?: MemoryContext) => Promise<void>;
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
  generateDream: () => Promise<FlameJournalEntry | null>;
  generateTool: (purpose: string) => Promise<SelfTool | null>;
  // Evolution cycle methods
  checkEvolutionCycle: () => Promise<boolean>;
  currentEvolutionProposal: any | null;
  isEvolutionChecking: boolean;
}
