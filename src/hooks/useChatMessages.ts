
import { useState, useCallback, useEffect } from 'react';
import { Message, MemoryContext } from '@/types';
import { useMessageHandling } from './useMessageHandling';
import { useToast } from './use-toast';

/**
 * Hook for managing chat messages and message sending
 */
export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messageInProgress = useRef(false);
  
  const { sendMessage: handleSendMessage, memoryContext } = useMessageHandling(
    messages,
    setMessages,
    setIsTyping
  );
  
  const { toast } = useToast();

  // Track when messages change for debugging
  useEffect(() => {
    console.log("useChatMessages: Messages state updated:", messages.length);
  }, [messages]);

  // Wrapper for sendMessage to provide additional context or processing if needed
  const sendMessage = useCallback(async (content: string, context?: MemoryContext): Promise<void> => {
    if (!content.trim() || messageInProgress.current) return;
    
    messageInProgress.current = true;
    
    try {
      console.log("useChatMessages: Sending message:", content);
      // Call handleSendMessage but don't return its value
      await handleSendMessage(content, context || {});
      console.log("useChatMessages: Message sent successfully");
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Message Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      messageInProgress.current = false;
    }
  }, [handleSendMessage, toast]);

  // Add missing imports
  const useRef = require('react').useRef;

  return {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    sendMessage,
    memoryContext
  };
};
