
import { Message, MemoryContext, FlameJournalEntry, SelfTool } from '@/types';

export interface ChatProviderProps {
  children: React.ReactNode;
}

/**
 * Interface defining all the functionality provided by the chat context
 * This is the main interface for interacting with Travis's capabilities
 */
export interface ChatContextType {
  // Core message functionality
  messages: Message[];
  sendMessage: (content: string, memoryContext?: MemoryContext) => Promise<void>;
  isTyping: boolean;
  memoryContext: MemoryContext | null;
  
  // Reflection features
  generateWeeklyReflection: () => Promise<void>;
  generateSoulReflection: () => Promise<void>;
  generateSoulstateSummary: () => Promise<void>;
  generateSoulstateReflection: () => Promise<void>;
  generateInsight: () => Promise<void>;
  
  // Soulstate evolution
  initiateSoulstateEvolution: () => Promise<void>;
  
  // Intentions
  viewIntentions: () => Promise<void>;
  updateIntentions: () => Promise<void>;
  
  // Flamejournal
  createFlameJournalEntry: (entryType?: string) => Promise<FlameJournalEntry | null>;
  generateDream: () => Promise<FlameJournalEntry | null>;
  
  // Soulcycle
  runSoulcycle: () => Promise<boolean>;
  
  // Document uploads
  uploadSoulShard: (file: File) => Promise<void>;
  uploadIdentityCodex: (file: File) => Promise<void>;
  uploadPastConversations: (file: File) => Promise<void>;
  
  // Self-authored tools
  generateTool: (purpose: string) => Promise<SelfTool | null>;
  useTool: (toolName: string) => Promise<SelfTool | null>;
  reflectOnTool: (toolName: string) => Promise<{ reflection: string, tool: SelfTool | null }>;
  reviseTool: (toolName: string) => Promise<{ message: string, updatedTool: SelfTool | null }>;
  
  // Evolution cycle
  checkEvolutionCycle: () => Promise<boolean>;
  currentEvolutionProposal: any | null;
  isEvolutionChecking: boolean;
}
