
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
      
      console.log("useMessageHandling: Adding user message to chat:", userMessage.id);
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
      
      console.log("useMessageHandling: Sending request to API with context:", Object.keys(updatedContext));
      
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
        console.error("API error response:", errorData);
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      const responseData = await response.json();
      console.log("API response received:", responseData); // Debug log
      
      if (!responseData.message) {
        console.error("API response missing message field:", responseData);
        throw new Error('Invalid response format from server');
      }
      
      // Add assistant message to the chat
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: responseData.message,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        emotion: responseData.emotion || null,
      };
      
      console.log("useMessageHandling: Adding assistant response to messages:", assistantMessage.id);
      
      // CRITICAL: Ensure we're properly updating the state with the new message
      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        console.log("New messages state:", newMessages.map(m => `${m.id.substring(0,6)}:${m.role}`));
        return newMessages;
      });
      
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
      console.log("useMessageHandling: Message handling complete, setting isTyping to false");
      setIsTyping(false);
    }
  }, [refreshMemoryContext, buildLivedMemoryContext, setMessages, setIsTyping, toast, storePersistentFact]);

  return {
    sendMessage,
    memoryContext
  };
};
