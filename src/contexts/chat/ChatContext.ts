
import { createContext } from 'react';
import { ChatContextType } from './types';

// Default context value
const defaultChatContext: ChatContextType = {
  messages: [],
  sendMessage: async () => {},
  isTyping: false,
  isLoading: false, // Added isLoading property
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
  uploadSoulShard: async () => {},
  uploadIdentityCodex: async () => {},
  uploadPastConversations: async () => {},
  generateInsight: async () => {},
  generateDream: async () => {},
  generateTool: async () => {},
  useTool: async (toolName: string, params: string) => {}, // Added arguments
  reflectOnTool: async (toolName: string) => {}, // Added argument
  reviseTool: async (toolName: string, params: string) => {}, // Added arguments
  checkEvolutionCycle: async () => {},
  currentEvolutionProposal: undefined,
  isEvolutionChecking: false,
  isLoadingHistory: false,
};

export const ChatContext = createContext<ChatContextType>(defaultChatContext);
