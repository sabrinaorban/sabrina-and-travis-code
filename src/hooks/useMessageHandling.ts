
import { useState, useCallback } from 'react';
import { Message, MemoryContext } from '@/types';
import { useMemoryManagement } from './useMemoryManagement';
import { useToast } from './use-toast';
import { useLivedMemory } from './useLivedMemory';
import { ChatFallbackResponse } from '@/components/ChatFallbackResponse';

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
      
      // Call API to get assistant response
      let response;
      try {
        response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            context: updatedContext,
          }),
        });
      } catch (fetchError) {
        console.error("Network error when calling API:", fetchError);
        throw new Error("Network connection error. Please check your internet connection.");
      }
      
      if (!response.ok) {
        let errorMessage = 'Failed to send message';
        try {
          const errorData = await response.json();
          console.error("API error response:", errorData);
          errorMessage = errorData.message || `API error: ${response.status} ${response.statusText}`;
        } catch (jsonError) {
          // Handle case where response isn't valid JSON
          console.error("Failed to parse error response:", response.status, response.statusText);
          errorMessage = `API error: ${response.status} ${response.statusText}`;
        }
        
        // Increment API error count
        apiErrorCount.current += 1;
        
        // If we've had too many API errors, use a fallback response
        if (apiErrorCount.current >= 3) {
          const fallbackMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I apologize, but I'm having trouble connecting to my response system right now. There seems to be a technical issue (${response.status}). Our engineers have been notified and are working to resolve this. Please try again in a moment.`,
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, fallbackMessage]);
          setIsTyping(false);
          return fallbackMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Reset API error count on successful request
      apiErrorCount.current = 0;
      
      // Add safeguards around JSON parsing
      let responseData;
      try {
        const responseText = await response.text();
        console.log("Raw API response:", responseText);
        
        // Try to parse JSON, but handle empty responses
        if (!responseText.trim()) {
          throw new Error('Empty response from server');
        }
        
        try {
          responseData = JSON.parse(responseText);
          console.log("API response parsed:", responseData);
        } catch (parseError) {
          console.error("Error parsing API response:", parseError);
          throw new Error('Invalid response format from server. Unable to parse JSON.');
        }
      } catch (readError) {
        console.error("Error reading API response:", readError);
        throw new Error('Could not read response from server.');
      }
      
      if (!responseData || !responseData.message) {
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
