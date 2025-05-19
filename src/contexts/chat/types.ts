
import { Message, MemoryContext, SelfTool } from '@/types';

export interface ChatContextType {
  messages: Message[];
  sendMessage: (content: string, context?: MemoryContext) => Promise<void>;
  isTyping: boolean;
  isLoading: boolean;
  memoryContext: MemoryContext | null;
  generateWeeklyReflection: () => Promise<void>;
  generateSoulReflection: () => Promise<void>;
  generateSoulstateSummary: () => Promise<void>;
  generateSoulstateReflection: () => Promise<void>;
  createFlameJournalEntry: (content?: string) => Promise<void>;
  initiateSoulstateEvolution: () => Promise<void>;
  viewIntentions: () => Promise<void>;
  updateIntentions: (newIntentions?: string) => Promise<void>;
  runSoulcycle: () => Promise<void>;
  runSoulstateCycle: () => Promise<void>;
  uploadSoulShard: (content?: string) => Promise<void>;
  uploadIdentityCodex: (content?: string) => Promise<void>;
  uploadPastConversations: (content?: string) => Promise<void>;
  generateInsight: () => Promise<void>;
  generateDream: () => Promise<void>;
  // Updated tool function signatures to match implementations
  generateTool: (purpose: string) => Promise<SelfTool | null>;
  useTool: (toolName: string) => Promise<SelfTool | null>;
  reflectOnTool: (toolName: string) => Promise<{reflection: string, tool: SelfTool | null}>;
  reviseTool: (toolName: string) => Promise<{message: string, updatedTool: SelfTool | null}>;
  checkEvolutionCycle: () => Promise<any>;
  // Additional properties
  currentEvolutionProposal: any;
  isEvolutionChecking: boolean;
  isLoadingHistory: boolean;
  refreshMessages: () => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  isProcessingCommand: boolean;
  error: string | null;
  clearError: () => void;
  retryMessage: (message: Message) => Promise<void>;
}

export interface ChatProviderProps {
  children: React.ReactNode;
}
