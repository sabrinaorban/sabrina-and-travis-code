
import { MemoryContext } from '../services/MemoryService';
import { Message, MessageRole, OpenAIMessage } from './index';

export interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'delete';
  path: string;
  content?: string;
}

export interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  summarizeConversation: () => Promise<void>;
  memoryContext: MemoryContext | null;
  refreshMemoryContext: () => Promise<MemoryContext | null>;
}
