
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
  // Add missing properties with proper typings
  addJournalEntry: (content?: string, entryType?: string) => Promise<any>;
  processFileOperation: (operation: string, filePath: string, content?: string) => Promise<boolean>;
  saveUserFeedback: (memoryId: string, feedback: { accurate: boolean, useful: boolean, notes?: string }) => Promise<boolean>;
  clearMessages: () => Promise<void>;
  summarizeConversation: () => Promise<void>;
  // Tool function signatures
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
