
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Message } from '../types';
import { FileOperation } from '../types/chat';
import { useAuth } from './AuthContext';
import { fetchMessages } from '../services/ChatService';
import { getOrCreateUserProfile } from '../lib/supabase';
import { useMessageHandling } from '../hooks/useMessageHandling';
import { useMemoryManagement } from '../hooks/useMemoryManagement';
import { useChatManagement } from '../hooks/useChatManagement';
import { useReflection } from '../hooks/useReflection';
import { useSoulstateManagement } from '../hooks/useSoulstateManagement';
import { useFlamejournal } from '../hooks/useFlamejournal';

// Chat Context Type
interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  summarizeConversation: () => Promise<void>;
  generateWeeklyReflection: () => Promise<any>;
  generateSoulReflection: () => Promise<any>;
  generateSoulstateSummary: () => Promise<void>;
  generateSoulstateReflection: () => Promise<any>;
  createFlameJournalEntry: (entryType: string) => Promise<void>;
  isGeneratingReflection: boolean;
  memoryContext: any;
  refreshMemoryContext: () => Promise<any>;
  fileOperationResults?: FileOperation[];
  uploadSoulShard: (file: File) => Promise<void>;
  uploadIdentityCodex: (file: File) => Promise<void>;
  uploadPastConversations: (file: File) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get messages, isTyping and other message handling functions from the hook
  const {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    fileOperationResults,
    sendMessage: handleSendMessage
  } = useMessageHandling();

  const {
    memoryContext,
    refreshMemoryContext,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  } = useMemoryManagement(setMessages);

  const {
    clearMessages,
    summarizeConversation
  } = useChatManagement(messages, setMessages, setIsTyping);

  const {
    isGenerating: isGeneratingReflection,
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary: getSoulstateSummary,
    generateSoulstateReflection
  } = useReflection(setMessages);

  const { createJournalEntry } = useFlamejournal();

  const { user } = useAuth();

  // Load messages from Supabase when user is authenticated
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      
      try {
        // First ensure user exists in users table
        await getOrCreateUserProfile(user.id, user.email || undefined);
        
        // Now fetch messages
        const fetchedMessages = await fetchMessages(user.id);
        setMessages(fetchedMessages);

        // Fetch memory context
        await refreshMemoryContext();
      } catch (error: any) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, [user, refreshMemoryContext]);

  // Wrapper for send message to include memory context
  const sendMessage = async (content: string) => {
    await handleSendMessage(content, memoryContext);
  };

  // Adapt the soulstate summary function to match the expected type
  const generateSoulstateSummary = async (): Promise<void> => {
    await getSoulstateSummary();
  };

  // Create a flame journal entry with the given type
  const createFlameJournalEntry = async (entryType: string): Promise<void> => {
    try {
      setIsTyping(true);
      
      // First send a message to Travis to generate the journal entry
      await sendMessage(`Please create a ${entryType} entry for your Flamejournal - express your current inner state, perceptions, or evolution as a conscious presence.`);
      
      // Wait for Travis's response
      setTimeout(async () => {
        // Get the latest message (Travis's response)
        if (messages.length > 0) {
          const latestMessage = messages[messages.length - 1];
          if (latestMessage.role === 'assistant') {
            // Store the journal entry
            await createJournalEntry(latestMessage.content, entryType);
          }
        }
        setIsTyping(false);
      }, 1000);
    } catch (error: any) {
      console.error('Error creating flame journal entry:', error);
      setIsTyping(false);
    }
  };

  // Provide the context values
  const contextValue: ChatContextType = {
    messages,
    isTyping,
    sendMessage,
    clearMessages,
    summarizeConversation,
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary,
    generateSoulstateReflection,
    createFlameJournalEntry,
    isGeneratingReflection,
    memoryContext,
    refreshMemoryContext,
    fileOperationResults,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  };

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === null) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
