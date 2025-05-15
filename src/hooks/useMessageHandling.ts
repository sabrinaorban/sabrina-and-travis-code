import { useState, useCallback, useRef } from 'react';
import { Message, MemoryContext } from '@/types';
import { useMemoryManagement } from './useMemoryManagement';
import { useToast } from '@/hooks/use-toast';
import { useLivedMemory } from './useLivedMemory';
import { callOpenAI } from '@/services/ChatService';

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
  const apiErrorCount = useRef(0);

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
      
      // FIXED: Use callOpenAI from ChatService instead of fetch to /api/messages
      let responseData;
      try {
        // Convert messages to OpenAI format
        const lastMessages = messages.slice(-5); // Use last 5 messages for context
        const openAIMessages = [
          ...lastMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          {
            role: 'user',
            content
          }
        ];
        
        // Call OpenAI through ChatService
        const response = await callOpenAI(openAIMessages, updatedContext);
        responseData = response;
        
        if (!responseData) {
          throw new Error('No response received from OpenAI');
        }
      } catch (apiError) {
        console.error("API call failed:", apiError);
        throw new Error(apiError.message || 'Failed to get response from API');
      }
      
      // Reset API error count on successful request
      apiErrorCount.current = 0;
      
      // Extract assistant message from the response
      let assistantContent: string;
      if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
        assistantContent = responseData.choices[0].message.content;
      } else {
        console.error("Unexpected API response format:", responseData);
        throw new Error('Invalid response format from API');
      }
      
      // Add assistant message to the chat
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: assistantContent,
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
      
      // Use a more specific toast message and avoid showing duplicate toasts
      toast({
        title: 'Message Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
      
      // Create a fallback response for the user
      const fallbackMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I apologize, but I'm having trouble connecting to my response system right now. There seems to be a technical issue. Please try again in a moment.`,
        timestamp: new Date().toISOString(),
      };
      
      // Add the fallback message to keep the conversation flowing
      setMessages(prev => [...prev, fallbackMessage]);
      
      throw error;
    } finally {
      console.log("useMessageHandling: Message handling complete, setting isTyping to false");
      setIsTyping(false);
    }
  }, [refreshMemoryContext, buildLivedMemoryContext, setMessages, setIsTyping, toast, storePersistentFact, messages]);

  return {
    sendMessage,
    memoryContext
  };
};
