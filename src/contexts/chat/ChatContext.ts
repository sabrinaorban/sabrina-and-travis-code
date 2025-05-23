
import { createContext } from 'react';
import { ChatContextType } from './types';
import { SelfTool } from '@/types';

// Default context value
const defaultChatContext: ChatContextType = {
  messages: [],
  sendMessage: async () => {},
  isTyping: false,
  isLoading: false,
  memoryContext: null,
  generateWeeklyReflection: async () => {},
  generateSoulReflection: async () => {},
  generateSoulstateSummary: async () => {},
  generateSoulstateReflection: async () => {},
  createFlameJournalEntry: async () => {},
  initiateSoulstateEvolution: async () => {},
  viewIntentions: async () => {},
  updateIntentions: async () => {},
  runSoulcycle: async () => {},
  runSoulstateCycle: async () => {},
  uploadSoulShard: async () => {},
  uploadIdentityCodex: async () => {},
  uploadPastConversations: async () => {},
  generateInsight: async () => {},
  generateDream: async () => {},
  // Add missing properties based on the error message
  addJournalEntry: async () => null,
  processFileOperation: async () => false,
  saveUserFeedback: async () => false,
  clearMessages: async () => {},
  summarizeConversation: async () => {},
  // Keep existing tool-related properties
  generateTool: async (purpose: string): Promise<SelfTool | null> => null,
  useTool: async (toolName: string): Promise<SelfTool | null> => null,
  reflectOnTool: async (toolName: string): Promise<{reflection: string, tool: SelfTool | null}> => 
    ({ reflection: '', tool: null }),
  reviseTool: async (toolName: string): Promise<{message: string, updatedTool: SelfTool | null}> => 
    ({ message: '', updatedTool: null }),
  checkEvolutionCycle: async (): Promise<any> => {},
  currentEvolutionProposal: undefined,
  isEvolutionChecking: false,
  isLoadingHistory: false,
  refreshMessages: async () => {},
  addMessage: () => {},
  updateMessage: () => {},
  deleteMessage: () => {},
  isProcessingCommand: false,
  error: null,
  clearError: () => {},
  retryMessage: async () => {},
  // Add file operation functions
  readSharedFile: async () => ({ success: false, message: '', content: '' }),
  writeSharedFile: async () => ({ success: false, message: '' }),
  listSharedFiles: async () => ([]),
};

export const ChatContext = createContext<ChatContextType>(defaultChatContext);
