
import React, { useCallback, useEffect } from 'react';
import { ChatContext } from './ChatContext';
import { useChatMessages } from './useChatMessages';
import { useChatMemory } from './useChatMemory';
import { useChatTools } from './useChatTools';
import { useChatFlamejournal } from '@/hooks/useChatFlamejournal';
import { useChatCommandProcessing } from '@/hooks/useChatCommandProcessing';
import { useChatIntentionsAndReflection } from '@/hooks/useChatIntentionsAndReflection';
import { useChatManagement } from '@/hooks/useChatManagement';
import { Message, MemoryContext } from '@/types';
import { useAuth } from '../AuthContext';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    sendMessage,
    isLoadingHistory,
    memoryContext
  } = useChatMessages();
  
  // Add chat memory context
  const { enrichMemoryContext, saveUserFeedback } = useChatMemory();

  // Add file system operations
  const { processFileOperation } = useChatTools(setMessages);

  // Add flame journal
  const { addJournalEntry } = useChatFlamejournal(setMessages);

  // Add chat management
  const { clearMessages, summarizeConversation } = useChatManagement(
    messages, 
    setMessages, 
    setIsTyping
  );

  // Add command processor
  const {
    processCommand,
    isProcessing,
    checkEvolutionCycle
  } = useChatCommandProcessing(setMessages, sendMessage);

  // Add intentions and reflections
  const {
    viewIntentions,
    updateIntentions,
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary,
    initiateSoulstateEvolution,
    runSoulcycle,
    runSoulstateCycle,
    uploadSoulShard,
    uploadIdentityCodex, 
    uploadPastConversations,
    generateInsight,
    ensureInsightsProcessing
  } = useChatIntentionsAndReflection(setMessages);

  // Get auth context
  const { user } = useAuth();

  // Enhanced message sending with memory context
  const sendChatMessage = useCallback(async (content: string) => {
    // First check if it's a command
    const isCommand = await processCommand(content);
    
    // If it's a command, don't process as a normal message
    if (isCommand) {
      return;
    }
    
    try {
      // Get enhanced memory context
      const enhancedContext = await enrichMemoryContext(memoryContext || {});
      
      // Send the message with enhanced context
      await sendMessage(content, enhancedContext);

      // Trigger insights processing after a short delay to ensure message is stored
      setTimeout(() => {
        if (messages.length > 0) {
          ensureInsightsProcessing([...messages, { 
            id: 'temp-message', 
            role: 'user', 
            content,
            timestamp: new Date().toISOString() 
          }]);
        }
      }, 1000);
    } catch (error) {
      console.error("Error in sendChatMessage:", error);
    }
  }, [processCommand, enrichMemoryContext, memoryContext, sendMessage, ensureInsightsProcessing, messages]);

  // Effect to trigger insights processing when messages change significantly
  useEffect(() => {
    if (messages.length >= 10 && messages.length % 5 === 0) {
      console.log("Triggering insights processing based on message count");
      ensureInsightsProcessing(messages);
    }
  }, [messages.length, ensureInsightsProcessing, messages]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage: sendChatMessage,
        isTyping,
        isLoadingHistory,
        clearMessages,
        summarizeConversation,
        processFileOperation,
        addJournalEntry,
        viewIntentions,
        updateIntentions,
        generateWeeklyReflection,
        generateSoulReflection,
        generateSoulstateSummary,
        initiateSoulstateEvolution,
        runSoulcycle,
        runSoulstateCycle,
        uploadSoulShard,
        uploadIdentityCodex,
        uploadPastConversations,
        generateInsight,
        saveUserFeedback,
        checkEvolutionCycle,
        // All required properties from ChatContextType must be provided
        isLoading: isProcessing,
        memoryContext: memoryContext,
        generateSoulstateReflection: async () => {},
        createFlameJournalEntry: async () => {},
        generateDream: async () => {},
        generateTool: async () => null,
        useTool: async () => null,
        reflectOnTool: async () => ({ reflection: '', tool: null }),
        reviseTool: async () => ({ message: '', updatedTool: null }),
        currentEvolutionProposal: undefined,
        isEvolutionChecking: false,
        refreshMessages: async () => {},
        addMessage: (message) => {
          setMessages(prev => [...prev, message]);
        },
        updateMessage: (message) => {
          setMessages(prev => 
            prev.map(m => m.id === message.id ? message : m)
          );
        },
        deleteMessage: (messageId) => {
          setMessages(prev => prev.filter(m => m.id !== messageId));
        },
        isProcessingCommand: isProcessing,
        error: null,
        clearError: () => {},
        retryMessage: async () => {}
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
