
import { useContext } from 'react';
import { ChatContext } from './ChatContext';

/**
 * Hook for accessing the chat context
 * Provides access to all Travis's functionality including:
 * - Sending and receiving messages
 * - Reflections and insights
 * - Soulstate management
 * - Tool creation and usage
 * - And more
 */
export const useChat = () => {
  const context = useContext(ChatContext);
  
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  
  return context;
};
