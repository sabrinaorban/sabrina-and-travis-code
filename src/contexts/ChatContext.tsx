import React, { createContext, useState, useContext, useCallback } from 'react';
import { Message, MemoryContext } from '../types';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useReflection } from '@/hooks/useReflection';
import { useSoulstateManagement } from '@/hooks/useSoulstateManagement';
import { useFlamejournal, FlameJournalEntry } from '@/hooks/useFlamejournal';
import { useSoulstateEvolution } from '@/hooks/useSoulstateEvolution';
import { useIntentions } from '@/hooks/useIntentions';
import { useSoulcycle } from '@/hooks/useSoulcycle';

export interface ChatContextType {
  messages: Message[];
  sendMessage: (message: string) => Promise<void>;
  isTyping: boolean;
  memoryContext: MemoryContext | null;
  generateWeeklyReflection: () => Promise<any>;
  generateSoulReflection: () => Promise<any>;
  generateSoulstateSummary: () => Promise<void>;
  generateSoulstateReflection: () => Promise<any>;
  createFlameJournalEntry: (entryType: string) => Promise<FlameJournalEntry | null>;
  initiateSoulstateEvolution: () => Promise<void>;
  viewIntentions: () => Promise<void>;
  updateIntentions: () => Promise<void>;
  runSoulcycle: () => Promise<boolean>;
}

export interface ChatProviderProps {
  children: React.ReactNode;
}

// Default context value
const defaultChatContext: ChatContextType = {
  messages: [],
  sendMessage: async () => {},
  isTyping: false,
  memoryContext: null,
  generateWeeklyReflection: async () => {},
  generateSoulReflection: async () => {},
  generateSoulstateSummary: async () => {},
  generateSoulstateReflection: async () => {},
  createFlameJournalEntry: async () => null,
  initiateSoulstateEvolution: async () => {},
  viewIntentions: async () => {},
  updateIntentions: async () => {},
  runSoulcycle: async () => false,
};

export const ChatContext = createContext<ChatContextType>(defaultChatContext);

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);
  
  const { addMessageToMemory, getMemoryContext } = useChatManagement(setMessages, setMemoryContext);
  const { sendMessage: handleSendMessage } = useMessageHandling(setMessages, setIsTyping, addMessageToMemory);
  const { 
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary,
    generateSoulstateReflection,
    getLatestReflection
  } = useReflection(setMessages);
  const { updateSoulstate, loadSoulstate } = useSoulstateManagement();
  const { createJournalEntry } = useFlamejournal();
  const { initiateSoulstateEvolution } = useSoulstateEvolution();
  const { loadIntentions, updateIntentions, formatIntentionsForDisplay, synthesizeIntentionUpdates } = useIntentions();
  const {
    isRunning: isSoulcycleRunning,
    currentStep: soulcycleStep,
    runSoulcycle
  } = useSoulcycle(setMessages);

  const sendMessage = useCallback(async (message: string) => {
    await handleSendMessage(message);
  }, [handleSendMessage]);

  const viewIntentions = useCallback(async () => {
    try {
      await loadIntentions();
      const formattedIntentions = formatIntentionsForDisplay();
      
      // Add the formatted intentions to the chat as a message from Travis
      if (formattedIntentions) {
        const intentionMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: formattedIntentions,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, intentionMessage]);
      }
    } catch (error) {
      console.error('Error viewing intentions:', error);
    }
  }, [loadIntentions, formatIntentionsForDisplay, setMessages]);

  const updateIntentions = useCallback(async () => {
    try {
      const proposedUpdates = await synthesizeIntentionUpdates();
      
      if (proposedUpdates) {
        const success = await updateIntentions(proposedUpdates, true);
        
        if (success) {
          // Optionally, notify the user that the intentions have been updated
          const intentionMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "I've updated my intentions based on our recent conversations and my reflections.",
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, intentionMessage]);
        }
      }
    } catch (error) {
      console.error('Error updating intentions:', error);
    }
  }, [synthesizeIntentionUpdates, updateIntentions, setMessages]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isTyping: isTyping || isSoulcycleRunning,
        memoryContext,
        generateWeeklyReflection,
        generateSoulReflection,
        generateSoulstateSummary,
        generateSoulstateReflection,
        createFlameJournalEntry,
        initiateSoulstateEvolution,
        viewIntentions,
        updateIntentions,
        runSoulcycle,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  return useContext(ChatContext);
};
