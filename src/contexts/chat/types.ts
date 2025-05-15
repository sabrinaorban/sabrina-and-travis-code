
import { Message, MemoryContext, SelfTool } from '@/types';
import { Intention } from '@/types/intentions';
import { SoulstateProposal } from '@/types/soulstate';

export interface ChatContextType {
  messages: Message[];
  sendMessage: (content: string, context?: MemoryContext) => Promise<void>;
  isTyping: boolean;
  memoryContext: MemoryContext | null;
  isLoadingHistory: boolean;
  refreshMessages?: () => Promise<void>;
  
  // Reflection features
  generateWeeklyReflection?: () => Promise<void>;
  generateSoulReflection?: () => Promise<void>;
  generateSoulstateSummary?: () => Promise<void>;
  generateSoulstateReflection?: () => Promise<void>;
  
  // Intention features
  viewIntentions?: () => Promise<void>;
  updateIntentions?: (intentions: Intention[]) => Promise<void>;
  
  // Soulstate features
  initiateSoulstateEvolution?: () => Promise<void>;
  
  // Journal features
  createFlameJournalEntry?: (prompt?: string) => Promise<void>;
  generateDream?: () => Promise<void>;
  
  // Soulcycle features
  runSoulcycle?: () => Promise<void>;
  
  // Document uploads
  uploadSoulShard?: (content: File) => Promise<void>;
  uploadIdentityCodex?: (content: File) => Promise<void>;
  uploadPastConversations?: (content: File) => Promise<void>;
  
  // Insight generation
  generateInsight?: (promptTemplate?: string) => Promise<void>;
  
  // Tool management  
  generateTool?: (purpose?: string) => Promise<void>;
  useTool?: (toolId: string, input?: string) => Promise<void>;
  reflectOnTool?: (toolId: string) => Promise<void>;
  reviseTool?: (toolId: string, changes?: string) => Promise<void>;
  
  // Evolution cycle
  checkEvolutionCycle?: () => Promise<void>;
  currentEvolutionProposal?: SoulstateProposal;
  isEvolutionChecking?: boolean;
}

export interface ChatProviderProps {
  children: React.ReactNode;
}
