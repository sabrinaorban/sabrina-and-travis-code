
import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, MemoryContext } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useChatCommands } from './useChatCommands';

/**
 * Hook for managing chat messages and message sending
 */
export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messageInProgress = useRef(false);
  const toastShown = useRef<{[key: string]: boolean}>({});
  const historyLoadAttempted = useRef(false);
  const latestMessageRef = useRef<string | null>(null);
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Add the command handling
  const { handleChatCommand } = useChatCommands(setMessages);

  // Fixed sendMessage function
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim()) {
      console.log("Message rejected: Empty content");
      return;
    }
    
    setIsTyping(true);
    
    try {
      console.log("useChatMessages: Processing message:", content);
      
      // Check if this is a command
      const isCommand = await handleChatCommand(content);
      if (isCommand) {
        console.log("Message handled as command");
        return;
      }
      
      // Stub implementation - actual message handling would be more complex
      setTimeout(() => {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'I received your message: ' + content,
          timestamp: new Date().toISOString(),
          emotion: 'neutral'
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }, 500);
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Message Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    }
  }, [toast, handleChatCommand]);

  // Add message management functions
  const addMessage = useCallback((message: Message): void => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>): void => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, ...updates } : msg));
  }, []);

  const deleteMessage = useCallback((id: string): void => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const refreshMessages = useCallback(async (): Promise<void> => {
    // Stub implementation
    console.log('Refreshing messages');
  }, []);

  return {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    sendMessage,
    memoryContext,
    isLoadingHistory,
    refreshMessages,
    isProcessingCommand,
    addMessage,
    updateMessage,
    deleteMessage
  };
};
