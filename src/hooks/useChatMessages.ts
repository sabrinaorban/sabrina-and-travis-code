
import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, MemoryContext } from '@/types';
import { useMessageHandling } from './useMessageHandling';
import { useToast } from '@/hooks/use-toast';
import { fetchMessages as fetchMessagesFromSupabase } from '@/services/ChatService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for managing chat messages and message sending
 */
export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messageInProgress = useRef(false);
  const toastShown = useRef<{[key: string]: boolean}>({});
  
  const { user } = useAuth();
  
  const { sendMessage: handleSendMessage, memoryContext } = useMessageHandling(
    messages,
    setMessages,
    setIsTyping
  );
  
  const { toast } = useToast();

  // Load chat history from Supabase when component mounts or user changes
  useEffect(() => {
    if (!user?.id) return;
    
    const loadMessages = async () => {
      try {
        setIsLoadingHistory(true);
        const loadedMessages = await fetchMessagesFromSupabase(user.id);
        console.log(`Loaded ${loadedMessages.length} messages from Supabase`);
        
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: 'Message Loading Error',
          description: 'Could not load chat history. Some features may be limited.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadMessages();
  }, [user?.id, toast]);

  // Track when messages change for debugging
  useEffect(() => {
    console.log("useChatMessages: Messages state updated:", messages.length);
  }, [messages]);

  // Wrapper for sendMessage to provide additional context or processing if needed
  const sendMessage = useCallback(async (content: string, context?: MemoryContext): Promise<void> => {
    // Prevent empty messages or sending while another message is in progress
    if (!content.trim()) {
      console.log("Message rejected: Empty content");
      return;
    }
    
    if (messageInProgress.current) {
      console.log("Message rejected: Message already in progress");
      return;
    }
    
    messageInProgress.current = true;
    
    try {
      console.log("useChatMessages: Sending message:", content);
      // Call handleSendMessage but don't return its value
      await handleSendMessage(content, context || {});
      console.log("useChatMessages: Message sent successfully");
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Prevent duplicate toasts for the same error message
      const errorMessage = error.message || 'Failed to send message';
      const errorKey = `error-${errorMessage}`;
      
      if (!toastShown.current[errorKey]) {
        toast({
          title: 'Message Error',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Mark this error as shown and set a timeout to clear it
        toastShown.current[errorKey] = true;
        setTimeout(() => {
          toastShown.current[errorKey] = false;
        }, 5000);
      }
      
      // Add a fallback response if none was added by the messageHandling hook
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role !== 'assistant') {
        const fallbackMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "I'm having trouble connecting to my response system. Please try again in a moment.",
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, fallbackMessage]);
      }
    } finally {
      // Ensure we reset the messageInProgress flag even if an error occurs
      setTimeout(() => {
        messageInProgress.current = false;
      }, 1000);
    }
  }, [handleSendMessage, toast, messages]);

  return {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    sendMessage,
    memoryContext,
    isLoadingHistory
  };
};
