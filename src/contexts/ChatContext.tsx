
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Message } from '../types';
import { useToast } from '@/hooks/use-toast';
import { supabase, getOrCreateUserProfile } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { MemoryService, MemoryContext as MemoryContextType } from '../services/MemoryService';
import { 
  fetchMessages, 
  storeUserMessage, 
  storeAssistantMessage, 
  deleteAllMessages,
  createOpenAIMessages,
  extractTopicFromMessages,
  simulateAssistantResponse
} from '../services/ChatService';
import { ChatContextType } from '../types/chat';

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [memoryContext, setMemoryContext] = useState<MemoryContextType | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load messages from Supabase when user is authenticated
  useEffect(() => {
    const fetchMessagesAndMemory = async () => {
      if (!user) return;
      
      try {
        console.log('Fetching messages for user:', user.id);
        // First ensure user exists in users table
        await getOrCreateUserProfile(user.id, user.email || undefined);
        
        // Now fetch messages
        const fetchedMessages = await fetchMessages(user.id);
        setMessages(fetchedMessages);

        // Fetch memory context
        await refreshMemoryContext();
      } catch (error: any) {
        console.error('Error fetching messages and memory:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat history and memory context',
          variant: 'destructive',
        });
      }
    };
    
    fetchMessagesAndMemory();
  }, [user, toast]);

  const refreshMemoryContext = async () => {
    if (!user) return null;

    try {
      const context = await MemoryService.getMemoryContext(user.id);
      setMemoryContext(context);
      return context;
    } catch (error) {
      console.error('Error refreshing memory context:', error);
      return null;
    }
  };

  const sendMessage = async (content: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive',
      });
      return;
    }
    
    // Don't send empty messages
    if (!content.trim()) return;

    try {
      // Ensure user exists in the database
      await getOrCreateUserProfile(user.id, user.email || undefined);
      
      // Create and add user message
      const newUserMessage = await storeUserMessage(user.id, content);
      
      // Add message to local state immediately for UI responsiveness
      setMessages((prev) => [...prev, newUserMessage]);

      // Set typing indicator while waiting for response
      setIsTyping(true);

      try {
        // Refresh memory context before sending to OpenAI
        const context = await refreshMemoryContext();
        
        // Create the OpenAI messages from chat history
        const openAIMessages = await createOpenAIMessages(messages, newUserMessage, context || memoryContext);
        
        // Call OpenAI API through Supabase Edge Function
        const { data: response, error: apiError } = await supabase.functions.invoke('openai-chat', {
          body: { 
            messages: openAIMessages,
            memoryContext: context || memoryContext
          }
        });

        if (apiError) {
          throw apiError;
        }

        // Process the assistant's response
        const assistantResponse = response.choices[0].message.content;
        
        // Store the response
        const newAssistantMessage = await storeAssistantMessage(user.id, assistantResponse);
        
        // Add to local state
        setMessages((prev) => [...prev, newAssistantMessage]);
        
        // Store this interaction in memory
        if (user) {
          await MemoryService.storeMemory(user.id, 'last_conversation', {
            topic: extractTopicFromMessages([...messages, newUserMessage, newAssistantMessage]),
            timestamp: Date.now(),
            messageCount: messages.length + 2
          });
        }
      } catch (error) {
        // If the OpenAI call fails, fall back to simulated responses
        console.error('Error calling OpenAI:', error);
        
        // Simulate Travis's response based on the message content
        const assistantResponse = simulateAssistantResponse(content);

        // Add the fallback assistant's response
        const newFallbackMessage = await storeAssistantMessage(user.id, assistantResponse);
        
        setMessages((prev) => [...prev, newFallbackMessage]);
          
        toast({
          title: 'Warning',
          description: 'Using fallback response as OpenAI API call failed',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error in chat flow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const clearMessages = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to clear messages',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await deleteAllMessages(user.id);
      setMessages([]);
      
      toast({
        title: 'Success',
        description: 'Chat history cleared',
      });
    } catch (error: any) {
      console.error('Error clearing messages:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear messages',
        variant: 'destructive',
      });
    }
  };

  return (
    <ChatContext.Provider value={{ 
      messages, 
      isTyping, 
      sendMessage, 
      clearMessages,
      memoryContext,
      refreshMemoryContext
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === null) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
