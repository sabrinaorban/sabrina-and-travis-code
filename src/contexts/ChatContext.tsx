
// This file re-exports from the refactored context structure
// for backward compatibility
export { 
  ChatContext, 
  ChatProvider, 
  useChat 
} from './chat';
export type { 
  ChatContextType, 
  ChatProviderProps 
} from './chat/types';
