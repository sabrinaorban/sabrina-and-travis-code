
import { createContext } from 'react';
import { ChatContextType } from './types';

// Default context value
const defaultChatContext: ChatContextType = {
  messages: [],
  sendMessage: async () => {},
  isTyping: false,
  memoryContext: null,
  generateWeeklyReflection: async () => {},
  generateSoulReflection: async () => {},
  generateSoulstateSummary: async () => {},
  generateSoulstateReflection: async () => {},
  createFlameJournalEntry: async () => null,
  initiateSoulstateEvolution: async () => {},
  viewIntentions: async () => {},
  updateIntentions: async () => {},
  runSoulcycle: async () => false,
  uploadSoulShard: async () => {},
  uploadIdentityCodex: async () => {},
  uploadPastConversations: async () => {},
  generateInsight: async () => {},
  generateDream: async () => null,
  generateTool: async () => null,
  // New tool-related methods
  useTool: async () => null,
  reflectOnTool: async () => ({ reflection: '', tool: null }),
  reviseTool: async () => ({ message: '', updatedTool: null }),
  // Evolution cycle methods
  checkEvolutionCycle: async () => false,
  currentEvolutionProposal: null,
  isEvolutionChecking: false,
};

export const ChatContext = createContext<ChatContextType>(defaultChatContext);
