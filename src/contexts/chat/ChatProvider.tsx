
import React, { useCallback, useEffect, useState } from 'react';
import { ChatContext } from './ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useChatFlamejournal } from './useChatFlamejournal';
import { useChatMemory } from './useChatMemory';
import { useChatTools } from './useChatTools';
import { useChatMessages } from './useChatMessages';
import { useChatCommandProcessing } from '@/hooks/useChatCommandProcessing';
import { Message, MemoryContext, SelfTool } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useChatCommands } from './useChatCommands';
// Import from hooks directory - fix the import name to avoid conflicts
import { useChatIntentionsAndReflection } from '@/hooks/useChatIntentionsAndReflection';

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
    generateTool,
    executeTool,
    isExecuting: isProcessingTool,
    processToolCreation,
    handleToolCommand
  } = useChatTools(setMessages);
  
  // Process special commands using the command processor - pass setMessages as argument
  const {
    processCommand,
    checkEvolutionCycle,
    isProcessing: isProcessingCommand,
    messages: commandMessages
  } = useChatCommandProcessing(setMessages, sendChatMessage);

  // Add chat command processing
  const { handleChatCommand, isProcessingCommand: isProcessingSlashCommand } = 
    useChatCommands(setMessages);
  
  // Access all the chat intention hooks using the renamed import
  const { 
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary,
    generateSoulstateReflection,
    initiateSoulstateEvolution,
    viewIntentions,
    updateIntentions,
    runSoulcycle,
    runSoulstateCycle,
    checkAndTriggerWeeklyReflection,
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

  // This is the primary wrapper for sending messages that handles both commands and normal messages
  const sendMessage = useCallback(async (content: string, context?: MemoryContext) => {
    if (!content.trim()) {
      return;
    }
    
    try {
      // First check if it's a special command that should be processed by the useChatCommandProcessing hook
      if (content.startsWith('/')) {
        // Try to process with special command processor first
        const isProcessed = await processCommand(content, context);
        if (isProcessed) {
          // If it was processed by the special command processor, we're done
          return;
        }
        
        // If it wasn't processed by the special command processor, try the standard command handler
        const isCommand = await handleChatCommand(content);
        if (isCommand) {
          // If it was a command, don't process it as a normal message
          return;
        }
      }
      
      // If it's not a command or none of the command handlers processed it,
      // send it as a normal message
      await sendChatMessage(content, context);
    } catch (e: any) {
      console.error('Error in sendMessage wrapper:', e);
      setError(e.message || 'Failed to send message.');
    }
  }, [processCommand, handleChatCommand, sendChatMessage]);

  // Now that sendMessage is defined, we can define retryMessage
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
  }, [user, sendMessage]);

  // Initialize currentEvolutionProposal state
  const [currentEvolutionProposal, setCurrentEvolutionProposal] = useState<any>(undefined);
  const [isEvolutionChecking, setIsEvolutionChecking] = useState<boolean>(false);

  // Wrapper for checkEvolutionCycle that returns any instead of boolean
  const checkEvolutionCycleWrapper = useCallback(async (): Promise<any> => {
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
  
  // Automatic reflection trigger - check once a day
  useEffect(() => {
    if (!user) return;
    
    // Check if we should trigger a weekly reflection on initial load
    const initialCheck = setTimeout(() => {
      checkAndTriggerWeeklyReflection().catch(err => 
        console.error('Error checking for weekly reflection:', err)
      );
    }, 15000); // Wait 15 seconds after initial load
    
    // Set up a daily check
    const dailyCheck = setInterval(() => {
      checkAndTriggerWeeklyReflection().catch(err => 
        console.error('Error checking for weekly reflection:', err)
      );
    }, 24 * 60 * 60 * 1000); // Check once every 24 hours
    
    return () => {
      clearTimeout(initialCheck);
      clearInterval(dailyCheck);
    };
  }, [user, checkAndTriggerWeeklyReflection]);

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
        runSoulstateCycle,
        uploadSoulShard,
        uploadIdentityCodex,
        uploadPastConversations,
        generateInsight,
        generateDream,
        // Use the correctly typed functions from useChatTools
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
        isProcessingCommand: isProcessingCommand || isProcessingSlashCommand || isProcessingTool,
        error,
        clearError,
        retryMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
