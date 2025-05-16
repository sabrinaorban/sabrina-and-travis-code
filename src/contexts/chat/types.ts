
import { MemoryContext, Message } from '@/types';

export interface ChatContextType {
  messages: Message[];
  sendMessage: (content: string, context?: MemoryContext) => Promise<void>;
  isTyping: boolean; // Changed from isThinking to isTyping
  memoryContext: MemoryContext | null;
  generateWeeklyReflection: () => Promise<void>;
  generateSoulReflection: () => Promise<void>;
  generateSoulstateSummary: () => Promise<void>;
  generateSoulstateReflection: () => Promise<void>;
  createFlameJournalEntry: () => Promise<void>;
  initiateSoulstateEvolution: () => Promise<void>;
  viewIntentions: () => Promise<void>;
  updateIntentions: () => Promise<void>;
  runSoulcycle: () => Promise<void>;
  uploadSoulShard: () => Promise<void>;
  uploadIdentityCodex: () => Promise<void>;
  uploadPastConversations: () => Promise<void>;
  generateInsight: () => Promise<void>;
  generateDream: () => Promise<void>;
  generateTool: () => Promise<void>;
  useTool: () => Promise<void>;
  reflectOnTool: () => Promise<void>;
  reviseTool: () => Promise<void>;
  checkEvolutionCycle: () => Promise<void>;
  currentEvolutionProposal: any;
  isEvolutionChecking: boolean;
  isLoadingHistory: boolean;
  refreshMessages?: () => Promise<void>;
  // Additional properties from ChatProvider.tsx
  addMessage?: (message: Message) => void;
  updateMessage?: (message: Message) => void;
  deleteMessage?: (messageId: string) => void;
  isProcessingCommand?: boolean;
  error?: string | null;
  clearError?: () => void;
  retryMessage?: (message: Message) => Promise<void>;
}

export interface ChatProviderProps {
  children: React.ReactNode;
}
