import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, MemoryContext } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { fetchMessages as fetchMessagesFromSupabase, callOpenAI, storeUserMessage, storeAssistantMessage, createOpenAIMessages } from '@/services/ChatService';
import { useAuth } from '@/contexts/AuthContext';
import { useChatCommands } from './useChatCommands';

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
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null); // Add memoryContext state
  
  const { user } = useAuth();
  
  // Add the command handling
  const { handleChatCommand, isProcessingCommand } = useChatCommands(setMessages);
  
  // Since useMessageHandling doesn't actually provide the implementation we need,
  // we'll implement message sending logic directly here
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

  // Implement proper message sending logic that actually updates the messages state and gets AI responses
  const sendMessage = useCallback(async (content: string, context?: MemoryContext): Promise<void> => {
    if (!content.trim() || !user?.id) {
      console.log("Message rejected: Empty content or no user");
      return;
    }
    
    if (messageInProgress.current) {
      console.log("Message rejected: Message already in progress");
      return;
    }
    
    messageInProgress.current = true;
    setIsTyping(true);
    
    try {
      console.log("useChatMessages: Processing message:", content);
      
      // Update memoryContext if provided
      if (context) {
        setMemoryContext(context);
      }
      
      // First check if this is a command
      const isCommand = await handleChatCommand(content);
      if (isCommand) {
        // If it was a command, don't process as a normal message
        console.log("Message handled as command");
        messageInProgress.current = false;
        setIsTyping(false);
        return;
      }
      
      // 1. Add user message to state immediately for better UX
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content,
        timestamp: new Date().toISOString()
      };
      
      // Update messages state with user message
      setMessages(prev => [...prev, userMessage]);
      
      // 2. Store user message in database
      try {
        await storeUserMessage(user.id, content);
      } catch (error) {
        console.error("Failed to store user message:", error);
        // Continue anyway - the message is in the local state
      }
      
      // 3. Create placeholder for assistant response
      const placeholderId = crypto.randomUUID();
      const placeholderMessage: Message = {
        id: placeholderId,
        role: 'assistant',
        content: "I've received your message. Let me think about that...",
        timestamp: new Date().toISOString()
      };
      
      // Add placeholder to messages
      setMessages(prev => [...prev, placeholderMessage]);
      
      // 4. Generate real assistant response using OpenAI
      try {
        const openAIMessages = await createOpenAIMessages(
          messages, 
          userMessage, 
          memoryContext || {}
        );
        
        const response = await callOpenAI(openAIMessages, memoryContext || {});
        
        if (response && response.choices && response.choices[0]) {
          const assistantResponse = response.choices[0].message.content;
          
          // 5. Create the final assistant message
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: assistantResponse,
            timestamp: new Date().toISOString()
          };
          
          // 6. Replace the placeholder with the real response
          setMessages(prev => prev.map(msg => 
            msg.id === placeholderId ? assistantMessage : msg
          ));
          
          // 7. Store the assistant message
          await storeAssistantMessage(user.id, assistantResponse);
        } else {
          throw new Error("Invalid response format from OpenAI");
        }
      } catch (aiError) {
        console.error("Failed to get AI response:", aiError);
        
        // If AI call fails, keep the placeholder but update its content
        setMessages(prev => prev.map(msg => 
          msg.id === placeholderId 
            ? {
                ...msg,
                content: "I'm sorry, I couldn't process that request. Can you try again?"
              }
            : msg
        ));
      }
      
      console.log("useChatMessages: Message processed successfully");
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
    } finally {
      // Ensure we reset the messageInProgress flag and typing state
      setTimeout(() => {
        messageInProgress.current = false;
        setIsTyping(false);
      }, 1000);
    }
  }, [user?.id, toast, messages, memoryContext, handleChatCommand]);

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
    refreshMessages, // Export the refresh function for manual refreshing
    isProcessingCommand // Make sure to expose this so the UI can show when commands are processing
  };
};
