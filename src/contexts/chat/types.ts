
import { Message, MemoryContext, SelfTool } from '@/types';
import { FileOperationResult } from '@/hooks/useTravisFileOperations';

export interface ChatProviderProps {
  children: React.ReactNode;
}

export interface ChatContextType {
  messages: Message[];
  sendMessage: (message: string) => Promise<void>;
  isTyping: boolean;
  isLoading: boolean;
  memoryContext: MemoryContext | null;
  generateWeeklyReflection: () => Promise<void>;
  generateSoulReflection: () => Promise<void>;
  generateSoulstateSummary: (force?: boolean) => Promise<void>;
  generateSoulstateReflection: () => Promise<void>;
  createFlameJournalEntry: (content: string, type?: string) => Promise<void>;
  initiateSoulstateEvolution: () => Promise<void>;
  viewIntentions: () => Promise<void>;
  updateIntentions: (intentions: string) => Promise<void>;
  runSoulcycle: () => Promise<void>;
  runSoulstateCycle: () => Promise<void>;
  uploadSoulShard: (soulShard: string) => Promise<void>;
  uploadIdentityCodex: (identityCodex: string) => Promise<void>;
  uploadPastConversations: (conversations: any) => Promise<void>;
  generateInsight: () => Promise<void>;
  generateDream: () => Promise<void>;
  addJournalEntry: (content: string, type?: string, tags?: string[]) => Promise<boolean | null>;
  processFileOperation: (operation: string, filePath: string, content?: string) => Promise<boolean>;
  saveUserFeedback: (feedbackContent: string, rating: number) => Promise<boolean>;
  clearMessages: () => Promise<void>;
  summarizeConversation: () => Promise<void>;
  generateTool: (purpose: string) => Promise<SelfTool | null>;
  useTool: (toolName: string) => Promise<SelfTool | null>;
  reflectOnTool: (toolName: string) => Promise<{reflection: string, tool: SelfTool | null}>;
  reviseTool: (toolName: string) => Promise<{message: string, updatedTool: SelfTool | null}>;
  checkEvolutionCycle: () => Promise<any>;
  isEvolutionChecking: boolean;
  currentEvolutionProposal?: any;
  isLoadingHistory: boolean;
  refreshMessages: () => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  isProcessingCommand: boolean;
  error: string | null;
  clearError: () => void;
  retryMessage: () => Promise<void>;
  // Add file operation functions
  readSharedFile: (path: string) => Promise<FileOperationResult>;
  writeSharedFile: (path: string, content: string, overwrite?: boolean, reason?: string) => Promise<FileOperationResult>;
  listSharedFiles: () => Promise<string[]>;
}
