
import { Message, MemoryContext, SelfTool } from '@/types';
import { Intention } from '@/types/intentions';
import { SoulstateProposal } from '@/types/soulstate';

export interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  isLoadingHistory?: boolean;
  sendMessage: (content: string, context?: MemoryContext) => Promise<void>;
  memoryContext: MemoryContext | null;
  
  // Reflection features
  generateWeeklyReflection: () => Promise<void>;
  generateSoulReflection: () => Promise<void>;
  generateSoulstateSummary: () => Promise<void>;
  generateSoulstateReflection: () => Promise<void>;
  
  // Intention features
  viewIntentions: () => Promise<void>;
  updateIntentions: (newIntention: string) => Promise<void>;
  
  // Soulstate features
  initiateSoulstateEvolution: () => Promise<void>;
  
  // Journal features
  createFlameJournalEntry: (prompt?: string) => Promise<void>;
  generateDream: () => Promise<void>;
  
  // Soulcycle features
  runSoulcycle: () => Promise<void>;
  
  // Document uploads
  uploadSoulShard: (content: File) => Promise<void>;
  uploadIdentityCodex: (content: File) => Promise<void>;
  uploadPastConversations: (content: File) => Promise<void>;
  
  // Insight generation
  generateInsight: (topic: string) => Promise<void>;
  
  // Tool management
  generateTool: (purpose: string) => Promise<SelfTool | null>;
  useTool: (toolId: string, input?: string) => Promise<void>;
  reflectOnTool: (toolId: string) => Promise<void>;
  reviseTool: (toolId: string, changes?: string) => Promise<void>;
  
  // Evolution features
  checkEvolutionCycle: () => Promise<boolean>;
  currentEvolutionProposal?: SoulstateProposal;
  isEvolutionChecking: boolean;
}

export interface ChatProviderProps {
  children: React.ReactNode;
}
