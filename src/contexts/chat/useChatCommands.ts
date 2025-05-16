
import { useCallback, useState } from 'react';
import { useChatCommands as useBaseChatCommands } from '@/hooks/useChatCommands';
import { Message } from '@/types';

/**
 * Extended hook for chat commands within the chat context
 */
export const useChatCommands = (
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { processCommand, isProcessingCommand } = useBaseChatCommands();

  /**
   * Process a chat command and add the response to the message list
   */
  const handleChatCommand = useCallback(async (input: string): Promise<boolean> => {
    // Skip if it's not a command
    if (!input.startsWith('/')) {
      return false;
    }
    
    setIsProcessing(true);
    console.log("Processing slash command:", input);
    
    try {
      const result = await processCommand(input);
      
      // If it wasn't a command, do nothing
      if (!result.isCommand) {
        console.log("Not recognized as a command:", input);
        return false;
      }
      
      console.log("Command processed:", input, "Response:", result.response ? "yes" : "no");
      
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
    } catch (error) {
      console.error("Error processing command:", error);
      
      // Add error message to chat
      if (setMessages) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          emotion: 'concerned'
        }]);
      }
      
      return true; // Still treated as a command, even if it failed
    } finally {
      setIsProcessing(false);
    }
  }, [processCommand, setMessages]);

  return {
    handleChatCommand,
    isProcessingCommand: isProcessingCommand || isProcessing
  };
};
