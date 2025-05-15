
import { useState, useCallback, useRef } from 'react';
import { Message, MemoryContext } from '@/types';
import { useMemoryManagement } from './useMemoryManagement';
import { useToast } from '@/hooks/use-toast';
import { useLivedMemory } from './useLivedMemory';
import { callOpenAI, storeUserMessage, storeAssistantMessage } from '@/services/ChatService';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();

  // Function to send a message
  const sendMessage = useCallback(async (content: string, context: MemoryContext = {}) => {
    if (!content.trim() || !user?.id) return;
    
    try {
      // Add user message to the chat and persist to Supabase
      let userMessage: Message;
      try {
        userMessage = await storeUserMessage(user.id, content);
        console.log("Message stored in Supabase with ID:", userMessage.id);
      } catch (storeError) {
        console.error("Failed to store user message in Supabase:", storeError);
        // Create local message if storage fails
        userMessage = {
          id: crypto.randomUUID(),
          content,
          role: 'user',
          timestamp: new Date().toISOString(),
        };
        // Show persistence error to user
        toast({
          title: 'Storage Warning',
          description: 'Your message was sent but may not persist after page refresh',
          variant: 'destructive', // Changed 'warning' to 'destructive' to match allowed variants
        });
      }
      
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
      
      // Use callOpenAI from ChatService
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
      
      // Save assistant message to Supabase and add to chat
      let assistantMessage: Message;
      try {
        assistantMessage = await storeAssistantMessage(user.id, assistantContent, responseData.emotion || null);
      } catch (storeError) {
        console.error("Failed to store assistant message in Supabase:", storeError);
        // Create local message if storage fails
        assistantMessage = {
          id: crypto.randomUUID(),
          content: assistantContent,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          emotion: responseData.emotion || null,
        };
      }
      
      console.log("useMessageHandling: Adding assistant response to messages:", assistantMessage.id);
      
      // Update the state with the new message
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
      
      // Try to persist the fallback message if possible
      if (user?.id) {
        try {
          await storeAssistantMessage(user.id, fallbackMessage.content);
        } catch (e) {
          console.error("Failed to store fallback message:", e);
        }
      }
      
      // Add the fallback message to keep the conversation flowing
      setMessages(prev => [...prev, fallbackMessage]);
      
      throw error;
    } finally {
      console.log("useMessageHandling: Message handling complete, setting isTyping to false");
      setIsTyping(false);
    }
  }, [refreshMemoryContext, buildLivedMemoryContext, setMessages, setIsTyping, toast, storePersistentFact, messages, user]);

  return {
    sendMessage,
    memoryContext
  };
};
