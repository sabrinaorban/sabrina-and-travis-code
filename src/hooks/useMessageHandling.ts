
import { useState, useCallback } from 'react';
import { Message, MemoryContext } from '@/types';
import { useMemoryManagement } from './useMemoryManagement';
import { useToast } from './use-toast';
import { useLivedMemory } from './useLivedMemory';

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
  const { refreshMemoryContext } = useMemoryManagement(setMessages);
  const { buildLivedMemoryContext, storePersistentFact } = useLivedMemory();

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
      const updatedContext = await refreshMemoryContext() || {};
      setMemoryContext(updatedContext);
      
      // Enhance context with lived memory
      const livedMemoryBlocks = await buildLivedMemoryContext(content);
      if (livedMemoryBlocks.length > 0) {
        // Cast updatedContext to MemoryContext to ensure TypeScript knows it has the livedMemory property
        (updatedContext as MemoryContext).livedMemory = livedMemoryBlocks;
      }
      
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
      
      // Important: This line ensures the assistant's message appears in the chat
      setMessages(prev => [...prev, assistantMessage]);
      console.log("Assistant response added to messages:", assistantMessage);
      
      // Store any personal facts mentioned in the assistant's response
      if (responseData.personalFacts && Array.isArray(responseData.personalFacts)) {
        for (const fact of responseData.personalFacts) {
          await storePersistentFact(fact);
        }
      }
      
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
  }, [refreshMemoryContext, buildLivedMemoryContext, setMessages, setIsTyping, toast, storePersistentFact]);

  return {
    sendMessage,
    memoryContext
  };
};
