
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
  runSoulstateCycle: async () => {}, // Added the missing property
  uploadSoulShard: async () => {},
  uploadIdentityCodex: async () => {},
  uploadPastConversations: async () => {},
  generateInsight: async () => {},
  generateDream: async () => {},
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
};

export const ChatContext = createContext<ChatContextType>(defaultChatContext);
