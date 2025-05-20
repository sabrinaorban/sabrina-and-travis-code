
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

  // Track if we've processed recent messages to avoid duplicate processing
  const processedMessageCount = React.useRef(0);

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

      // Mark that we have new messages to process for insights
      // This helps ensure we only process after a real interaction
      processedMessageCount.current = 0;
    } catch (error) {
      console.error("Error in sendChatMessage:", error);
    }
  }, [processCommand, enrichMemoryContext, memoryContext, sendMessage]);

  // Only process insights after genuine user interaction and with rate limiting
  useEffect(() => {
    // Only attempt analysis after actual back-and-forth conversation
    const shouldProcessInsights = 
      messages.length >= 20 && // Need at least 20 messages total
      processedMessageCount.current !== messages.length && // Only if messages changed
      !isLoadingHistory && // Not during initial load
      !isTyping; // Not while typing
      
    if (shouldProcessInsights) {
      // Update processed count to prevent repeated processing
      processedMessageCount.current = messages.length;
      
      // Only process every 10th message to avoid excessive API calls
      if (messages.length % 10 === 0) {
        console.log("Processing insights after meaningful conversation change");
        ensureInsightsProcessing(messages);
      }
    }
  }, [messages, ensureInsightsProcessing, isLoadingHistory, isTyping]);

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
