
import { FileEntry, Message } from '../types';

export interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'delete';
  path: string;
  content?: string;
  success?: boolean;
  message?: string;
}

export interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  summarizeConversation: () => Promise<void>;
  memoryContext: any;
  refreshMemoryContext: () => Promise<any>;
  fileOperationResults?: FileOperation[];
}

export interface ChatInputProps {
  onSubmit: (message: string) => void;
  isDisabled?: boolean;
}
