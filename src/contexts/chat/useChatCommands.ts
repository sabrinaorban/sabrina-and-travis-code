
import { useCallback } from 'react';
import { useChatCommands as useBaseChatCommands } from '@/hooks/useChatCommands';
import { Message } from '@/types';

/**
 * Extended hook for chat commands within the chat context
 */
export const useChatCommands = (
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const { processCommand, isProcessingCommand } = useBaseChatCommands();

  /**
   * Process a chat command and add the response to the message list
   */
  const handleChatCommand = useCallback(async (input: string): Promise<boolean> => {
    const result = await processCommand(input);
    
    // If it wasn't a command, do nothing
    if (!result.isCommand) {
      return false;
    }
    
    // If we have a message handler, add the response as a system message
    if (setMessages && result.response) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        emotion: 'informative'
      }]);
    }
    
    return true;
  }, [processCommand, setMessages]);

  return {
    handleChatCommand,
    isProcessingCommand
  };
};
