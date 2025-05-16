
import { useCallback, useState } from 'react';
import { Message } from '@/types';

/**
 * Hook for managing tool execution within the chat context
 */
export const useChatTools = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Execute a tool based on the prompt
   * Returns true if a tool was executed, false otherwise
   */
  const executeTool = useCallback(async (prompt: string): Promise<boolean> => {
    // Check if the prompt contains a tool execution request
    if (!prompt.includes('/tool') && !prompt.includes('use tool')) {
      return false;
    }

    setIsExecuting(true);
    try {
      // Mock tool execution for now
      // This would be replaced with actual tool execution logic
      console.log('Executing tool for prompt:', prompt);
      
      // Add a message to show tool execution
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I executed a tool based on your request. This is a placeholder response.',
        timestamp: new Date().toISOString(),
        emotion: 'helpful'
      }]);
      
      return true;
    } catch (error) {
      console.error('Error executing tool:', error);
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, [setMessages]);

  return {
    executeTool,
    isExecuting
  };
};
