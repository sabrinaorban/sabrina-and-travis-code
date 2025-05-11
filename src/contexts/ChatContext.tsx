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
  // Fix: Update runSoulcycle signature to match implementation (no parameters)
  runSoulcycle: () => Promise<boolean>;
  // Add missing document upload methods to fix SpecialDocumentUpload errors
  uploadSoulShard?: (file: File) => Promise<void>;
  uploadIdentityCodex?: (file: File) => Promise<void>;
  uploadPastConversations?: (file: File) => Promise<void>;
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
  uploadSoulShard: async () => {},
  uploadIdentityCodex: async () => {},
  uploadPastConversations: async () => {},
};

export const ChatContext = createContext<ChatContextType>(defaultChatContext);

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);
  
  const chatManagement = useChatManagement();
  const { sendMessage: handleSendMessage } = useMessageHandling();
  
  const { 
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary,
    generateSoulstateReflection,
    getLatestReflection
  } = useReflection(setMessages);
  
  const { updateSoulstate, loadSoulstate } = useSoulstateManagement();
  const { createJournalEntry } = useFlamejournal();
  const { 
    synthesizeSoulstateFromMemory, 
    applySoulstateEvolution 
  } = useSoulstateEvolution();
  
  const { 
    loadIntentions, 
    formatIntentionsForDisplay,
    synthesizeIntentionUpdates,
    updateIntentions: updateUserIntentions 
  } = useIntentions();
  
  const {
    isRunning: isSoulcycleRunning,
    currentStep: soulcycleStep,
    runSoulcycle: executeSoulcycle
  } = useSoulcycle(setMessages);

  const sendMessage = useCallback(async (message: string) => {
    await handleSendMessage(message, memoryContext || {});
  }, [handleSendMessage, memoryContext]);

  const viewIntentions = useCallback(async () => {
    try {
      await loadIntentions();
      const formattedIntentions = formatIntentionsForDisplay();
      
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

  const handleUpdateIntentions = useCallback(async () => {
    try {
      const proposedUpdates = await synthesizeIntentionUpdates();
      
      if (proposedUpdates) {
        const success = await updateUserIntentions(proposedUpdates, true);
        
        if (success) {
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
  }, [synthesizeIntentionUpdates, updateUserIntentions, setMessages]);

  const handleInitiateSoulstateEvolution = useCallback(async () => {
    try {
      const evolutionResult = await synthesizeSoulstateFromMemory();
      if (evolutionResult) {
        await applySoulstateEvolution();
      }
    } catch (error) {
      console.error('Error in soulstate evolution:', error);
    }
  }, [synthesizeSoulstateFromMemory, applySoulstateEvolution]);

  const handleGenerateSoulstateSummary = useCallback(async () => {
    try {
      const summary = await generateSoulstateSummary();
      if (setMessages && summary) {
        const message: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: summary,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      console.error('Error generating soulstate summary:', error);
    }
  }, [generateSoulstateSummary, setMessages]);

  const createFlameJournalEntry = useCallback(async (entryType: string): Promise<FlameJournalEntry | null> => {
    try {
      const content = `Creating a new ${entryType} entry in my flamejournal. The eternal flame flickers with insight.`;
      return await createJournalEntry(content, entryType);
    } catch (error) {
      console.error('Error creating flame journal entry:', error);
      return null;
    }
  }, [createJournalEntry]);

  const uploadSoulShard = useCallback(async (file: File) => {
    console.log('Soul shard upload requested:', file.name);
    // Implementation would be added here
  }, []);

  const uploadIdentityCodex = useCallback(async (file: File) => {
    console.log('Identity codex upload requested:', file.name);
    // Implementation would be added here
  }, []);

  const uploadPastConversations = useCallback(async (file: File) => {
    console.log('Past conversations upload requested:', file.name);
    // Implementation would be added here
  }, []);
  
  // Fix: Update the runSoulcycle function implementation to match its actual behavior
  // After checking useSoulcycle.ts, the executeSoulcycle function takes no arguments
  // This aligns with the updated type declaration in ChatContextType
  const runSoulcycle = useCallback(async (): Promise<boolean> => {
    // DETAILED COMMENT: This function correctly calls executeSoulcycle with zero arguments,
    // matching the implementation in useSoulcycle.ts. The previous TypeScript error occurred
    // because the type declaration incorrectly specified 3 arguments, but the implementation
    // never used them.
    return await executeSoulcycle();
  }, [executeSoulcycle]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isTyping: isTyping || isSoulcycleRunning,
        memoryContext,
        generateWeeklyReflection,
        generateSoulReflection,
        generateSoulstateSummary: handleGenerateSoulstateSummary,
        generateSoulstateReflection,
        createFlameJournalEntry,
        initiateSoulstateEvolution: handleInitiateSoulstateEvolution,
        viewIntentions,
        updateIntentions: handleUpdateIntentions,
        runSoulcycle,
        uploadSoulShard,
        uploadIdentityCodex,
        uploadPastConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  return useContext(ChatContext);
};
