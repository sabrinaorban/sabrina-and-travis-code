
import React, { createContext, useState, useContext, useCallback } from 'react';
import { Message } from '../types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { 
  storeUserMessage, 
  storeAssistantMessage,
  extractTopicFromMessages,
  generateConversationSummary,
  simulateAssistantResponse
} from '../services/ChatService';
import { MemoryService } from '../services/MemoryService';
import { useGitHub } from './GitHubContext';

interface ChatOperationsContextType {
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  summarizeConversation: () => Promise<void>;
  isTyping: boolean;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatOperationsContext = createContext<ChatOperationsContextType | null>(null);

export const ChatOperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const github = useGitHub();

  // Function to clear all messages
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

  // Function to summarize the current conversation
  const summarizeConversation = async () => {
    if (!user || messages.length === 0) {
      toast({
        title: 'Error',
        description: 'No conversation to summarize',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsTyping(true);
      
      // Generate a summary of the conversation
      const topic = extractTopicFromMessages(messages);
      const summary = await generateConversationSummary(messages);
      
      // Store the summary
      await MemoryService.storeConversationSummary(user.id, summary, topic);
      
      // Add a message to indicate that the conversation was summarized
      const summaryMessage = await storeAssistantMessage(
        user.id, 
        `I've summarized our conversation about "${topic}". I'll remember the key points for future reference.`
      );
      
      setMessages((prev) => [...prev, summaryMessage]);
      
      toast({
        title: 'Success',
        description: 'Conversation summarized and stored in memory',
      });
    } catch (error: any) {
      console.error('Error summarizing conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to summarize conversation',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };
  
  // This is just a placeholder, the actual implementation will be in ChatContext
  const sendMessage = async (content: string) => {
    console.log("This is a placeholder for sendMessage");
  };

  return (
    <ChatOperationsContext.Provider value={{
      sendMessage,
      clearMessages,
      summarizeConversation,
      isTyping,
      setIsTyping,
      messages,
      setMessages,
    }}>
      {children}
    </ChatOperationsContext.Provider>
  );
};

export const useChatOperations = () => {
  const context = useContext(ChatOperationsContext);
  if (context === null) {
    throw new Error('useChatOperations must be used within a ChatOperationsProvider');
  }
  return context;
};

// This function is imported in ChatOperationsContext but not directly exported from MessageApiService
// We're adding it here to avoid circular dependencies
const deleteAllMessages = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
};

import { supabase } from '@/integrations/supabase/client';
