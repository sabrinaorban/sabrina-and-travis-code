
import { useState, useCallback } from 'react';
import { Message, MemoryContext } from '@/types';
import { useMessageHandling } from './useMessageHandling';
import { useToast } from './use-toast';

/**
 * Hook for managing chat messages and message sending
 */
export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const { sendMessage: handleSendMessage, memoryContext } = useMessageHandling(
    messages,
    setMessages,
    setIsTyping
  );
  
  const { toast } = useToast();

  // Wrapper for sendMessage to provide additional context or processing if needed
  const sendMessage = useCallback(async (content: string, context?: MemoryContext) => {
    if (!content.trim()) return;
    
    try {
      console.log("useChatMessages: Sending message:", content);
      const result = await handleSendMessage(content, context || {});
      console.log("useChatMessages: Message sent, result:", result);
      return result;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Message Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    }
  }, [handleSendMessage, toast]);

  return {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    sendMessage,
    memoryContext
  };
};
