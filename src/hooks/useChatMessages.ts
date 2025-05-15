
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
  const historyLoadAttempted = useRef(false); // Track if we've attempted to load history
  const latestMessageRef = useRef<string | null>(null); // Track the latest message ID
  
  const { user } = useAuth();
  
  const { sendMessage: handleSendMessage, memoryContext } = useMessageHandling(
    messages,
    setMessages,
    setIsTyping
  );
  
  const { toast } = useToast();
  
  // Track the latest message ID whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      latestMessageRef.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  // Load chat history from Supabase when component mounts or user changes
  useEffect(() => {
    // Skip if we don't have a user yet
    if (!user?.id) {
      // If no user, we're not actually loading
      setIsLoadingHistory(false);
      return;
    }
    
    // Only attempt to load once per user
    if (historyLoadAttempted.current) {
      return;
    }
    
    historyLoadAttempted.current = true;
    
    const loadMessages = async () => {
      try {
        setIsLoadingHistory(true);
        console.log('Loading messages for user:', user.id);
        
        // Add retry mechanism for more reliability
        let attempts = 0;
        let loadedMessages: Message[] = [];
        
        while (attempts < 3) {
          try {
            loadedMessages = await fetchMessagesFromSupabase(user.id);
            console.log(`Loaded ${loadedMessages.length} messages from Supabase on attempt ${attempts + 1}`);
            break; // Success - exit the retry loop
          } catch (retryError) {
            console.error(`Error loading messages (attempt ${attempts + 1}):`, retryError);
            attempts++;
            if (attempts < 3) {
              // Wait before retrying (exponential backoff)
              await new Promise(r => setTimeout(r, 1000 * attempts));
            }
          }
        }
        
        if (loadedMessages.length > 0) {
          // Sort by timestamp to ensure correct order
          loadedMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          console.log("Latest message timestamp:", loadedMessages[loadedMessages.length - 1].timestamp);
          setMessages(loadedMessages);
          latestMessageRef.current = loadedMessages[loadedMessages.length - 1].id;
        }
      } catch (error) {
        console.error('Error in loadMessages:', error);
        toast({
          title: 'Message Loading Error',
          description: 'Could not load chat history. Some features may be limited.',
          variant: 'destructive',
        });
      } finally {
        // Ensure we always set loading to false, even if there's an error
        setIsLoadingHistory(false);
      }
    };
    
    loadMessages();
  }, [user?.id, toast]);

  // Track when messages change for debugging
  useEffect(() => {
    console.log("useChatMessages: Messages state updated:", messages.length);
  }, [messages]);

  // Add a safeguard to reset loading state after a timeout
  useEffect(() => {
    // If loading takes more than 10 seconds, force it to false
    const loadingTimeout = setTimeout(() => {
      if (isLoadingHistory) {
        console.warn('Loading history timeout reached. Forcing loading state to false.');
        setIsLoadingHistory(false);
      }
    }, 10000);
    
    return () => clearTimeout(loadingTimeout);
  }, [isLoadingHistory]);

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

  // Function to manually refresh messages from the database
  const refreshMessages = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    
    try {
      setIsLoadingHistory(true);
      console.log('Manually refreshing messages for user:', user.id);
      const refreshedMessages = await fetchMessagesFromSupabase(user.id);
      
      // Only update if we got messages back
      if (refreshedMessages.length > 0) {
        // Sort by timestamp to ensure correct order
        refreshedMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        console.log(`Refreshed ${refreshedMessages.length} messages from Supabase`);
        setMessages(refreshedMessages);
      }
    } catch (error) {
      console.error('Error refreshing messages:', error);
      toast({
        title: 'Refresh Error',
        description: 'Could not refresh chat history.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id, toast]);

  return {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    sendMessage,
    memoryContext,
    isLoadingHistory,
    refreshMessages // Export the refresh function for manual refreshing
  };
};
