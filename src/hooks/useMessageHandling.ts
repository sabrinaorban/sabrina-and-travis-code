
import { useState, useCallback } from 'react';
import { Message, MemoryContext } from '@/types';
import { useMemoryManagement } from './useMemoryManagement';
import { useToast } from './use-toast';

/**
 * Hook for handling message sending and processing
 */
export const useMessageHandling = (
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);
  const { toast } = useToast();
  const { getMemoryContext, storeMemory } = useMemoryManagement(setMessages);

  // Function to send a message
  const sendMessage = useCallback(async (content: string, context: MemoryContext = {}) => {
    if (!content.trim()) return;
    
    try {
      // Add user message to the chat
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      
      // Get or update memory context
      const updatedContext = await getMemoryContext(content, context);
      setMemoryContext(updatedContext);
      
      // Call API to get assistant response
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          context: updatedContext,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      const responseData = await response.json();
      
      // Add assistant message to the chat
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: responseData.message,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        emotion: responseData.emotion || null,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Store the conversation in memory
      await storeMemory(userMessage, assistantMessage, updatedContext);
      
      return assistantMessage;
    } catch (error: any) {
      console.error('Error in sendMessage:', error);
      toast({
        title: 'Message Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsTyping(false);
    }
  }, [getMemoryContext, setMessages, setIsTyping, storeMemory, toast]);

  return {
    sendMessage,
    memoryContext
  };
};
