
import React, { useCallback, useEffect, useState } from 'react';
import { ChatContext } from './ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useChatFlamejournal } from './useChatFlamejournal';
import { useChatMemory } from './useChatMemory';
import { useChatTools } from './useChatTools';
import { useChatMessages } from './useChatMessages';
import { useChatCommandProcessing } from '@/hooks/useChatCommandProcessing';
import { Message, MemoryContext } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Use the combined hooks for message handling
  const {
    messages,
    setMessages,
    isTyping,
    sendMessage: sendChatMessage,
    memoryContext,
    isLoadingHistory,
    refreshMessages
  } = useChatMessages();
  
  // Get tool and other feature hooks
  const {
    createFlameJournalEntry,
    generateDream,
  } = useChatFlamejournal(setMessages);

  const { storeMemory, recallRelevantMemories } = useChatMemory();

  const { 
    useTool,
    reflectOnTool,
    reviseTool,
    generateTool 
  } = useChatTools(setMessages);
  
  // Process special commands using the command processor
  const {
    processCommand,
    checkEvolutionCycle,
    isProcessing: isProcessingCommand
  } = useChatCommandProcessing(setMessages, sendChatMessage);

  // Access all the chat intention hooks
  const { 
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary,
    generateSoulstateReflection,
    initiateSoulstateEvolution,
    viewIntentions,
    updateIntentions,
    runSoulcycle,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations,
    generateInsight
  } = useChatIntentionsAndReflection(setMessages);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const addMessage = useCallback((message: Message) => {
    console.log("Adding message to chat:", message.role, message.content.substring(0, 30) + "...");
    setMessages((prevMessages) => [...prevMessages, message]);
  }, [setMessages]);

  const updateMessage = useCallback((message: Message) => {
    setMessages((prevMessages) =>
      prevMessages.map((m) => (m.id === message.id ? message : m))
    );
  }, [setMessages]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prevMessages) =>
      prevMessages.filter((message) => message.id !== messageId)
    );
  }, [setMessages]);

  const retryMessage = useCallback(async (message: Message) => {
    if (!user) {
      setError('You must be logged in to send messages.');
      return;
    }

    try {
      // We'll reuse our sendMessage functionality with the original content
      await sendMessage(message.content);
    } catch (e: any) {
      console.error('Error retrying message:', e);
      setError(e.message || 'Failed to retry message.');
    }
  }, [user]);
  
  // This is the primary wrapper for sending messages that handles both commands and normal messages
  const sendMessage = useCallback(async (content: string, context?: MemoryContext) => {
    if (!content.trim()) {
      return;
    }
    
    try {
      // First check if it's a slash command
      if (content.startsWith('/')) {
        const isCommand = await processCommand(content, context);
        if (isCommand) {
          // If it was a command, don't process it as a normal message
          return;
        }
      }
      
      // If it's not a command or the command handler didn't handle it,
      // send it as a normal message
      await sendChatMessage(content, context);
    } catch (e: any) {
      console.error('Error in sendMessage wrapper:', e);
      setError(e.message || 'Failed to send message.');
    }
  }, [processCommand, sendChatMessage]);

  // Initialize currentEvolutionProposal state
  const [currentEvolutionProposal, setCurrentEvolutionProposal] = useState<any>(undefined);
  const [isEvolutionChecking, setIsEvolutionChecking] = useState<boolean>(false);

  // Wrapper for checkEvolutionCycle
  const checkEvolutionCycleWrapper = useCallback(async () => {
    setIsEvolutionChecking(true);
    try {
      const proposal = await checkEvolutionCycle();
      setCurrentEvolutionProposal(proposal);
      return proposal;
    } catch (e) {
      console.error('Error checking evolution cycle:', e);
      return null;
    } finally {
      setIsEvolutionChecking(false);
    }
  }, [checkEvolutionCycle]);

  // Make sure we import useChatIntentionsAndReflection
  useEffect(() => {
    const importModule = async () => {
      try {
        const { useChatIntentionsAndReflection } = await import('@/hooks/useChatIntentionsAndReflection');
        console.log('Successfully imported useChatIntentionsAndReflection');
      } catch (e) {
        console.error('Failed to import useChatIntentionsAndReflection:', e);
      }
    };
    importModule();
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isTyping,
        isLoading: isLoadingHistory,
        isLoadingHistory,
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
        uploadSoulShard,
        uploadIdentityCodex,
        uploadPastConversations,
        generateInsight,
        generateDream,
        generateTool,
        useTool,
        reflectOnTool,
        reviseTool,
        checkEvolutionCycle: checkEvolutionCycleWrapper,
        currentEvolutionProposal,
        isEvolutionChecking,
        refreshMessages,
        // Additional properties exposed for components
        addMessage,
        updateMessage,
        deleteMessage,
        isProcessingCommand,
        error,
        clearError,
        retryMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// Import at the top of the file
function useChatIntentionsAndReflection(setMessages: React.Dispatch<React.SetStateAction<Message[]>>) {
  // This is just a temporary implementation until the real import works
  return {
    generateWeeklyReflection: async () => {
      console.log("generateWeeklyReflection called");
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: "Weekly reflection feature is being restored. Please try again later.",
        timestamp: new Date().toISOString()
      }]);
    },
    generateSoulReflection: async () => {
      console.log("generateSoulReflection called");
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: "Soul reflection feature is being restored. Please try again later.",
        timestamp: new Date().toISOString()
      }]);
    },
    generateSoulstateSummary: async () => {},
    generateSoulstateReflection: async () => {},
    initiateSoulstateEvolution: async () => {},
    viewIntentions: async () => {},
    updateIntentions: async () => {},
    runSoulcycle: async () => {},
    uploadSoulShard: async () => {},
    uploadIdentityCodex: async () => {},
    uploadPastConversations: async () => {},
    generateInsight: async () => {}
  };
}
