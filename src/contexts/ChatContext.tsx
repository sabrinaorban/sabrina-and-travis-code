
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
  
  // Fix the hook calls to match their expected signatures
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
    // Fix the function call that was causing the error - passing empty object as default memory context
    await handleSendMessage(message, memoryContext || {});
  }, [handleSendMessage, memoryContext]);

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

  const handleUpdateIntentions = useCallback(async () => {
    try {
      const proposedUpdates = await synthesizeIntentionUpdates();
      
      if (proposedUpdates) {
        const success = await updateUserIntentions(proposedUpdates, true);
        
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
  }, [synthesizeIntentionUpdates, updateUserIntentions, setMessages]);

  // Implement a stub for soulstate evolution
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

  // Create a wrapper for generateSoulstateSummary that returns void
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

  // Create a wrapper for FlameJournal entry creation
  const createFlameJournalEntry = useCallback(async (entryType: string): Promise<FlameJournalEntry | null> => {
    try {
      // This is just a simple implementation - you might want to customize content based on entryType
      const content = `Creating a new ${entryType} entry in my flamejournal. The eternal flame flickers with insight.`;
      return await createJournalEntry(content, entryType);
    } catch (error) {
      console.error('Error creating flame journal entry:', error);
      return null;
    }
  }, [createJournalEntry]);

  // Add placeholder implementations for upload functions
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
  
  // Fix the runSoulcycle function to match the signature expected by the component
  const runSoulcycle = useCallback(async (): Promise<boolean> => {
    // The useSoulcycle hook's executeSoulcycle function doesn't take any parameters
    // but the TypeScript error suggests it's expected to take 3 parameters
    // Let's check the actual implementation in useSoulcycle.ts
    
    // After checking, it seems the executeSoulcycle function takes no arguments
    // but the TypeScript definition might be incorrect
    // Let's call the function without parameters since that's what the implementation expects
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
