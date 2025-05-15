
import React, { useState, useCallback, useEffect } from 'react';
import { Message, MemoryContext, SelfTool } from '@/types';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import { ChatContext } from './ChatContext';
import { ChatProviderProps } from './types';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatIntentionsAndReflection } from '@/hooks/useChatIntentionsAndReflection';
import { useChatSoulstate } from '@/hooks/useChatSoulstate';
import { useChatFlamejournal } from '@/hooks/useChatFlamejournal';
import { useChatDocumentUpload } from '@/hooks/useChatDocumentUpload';
import { useChatSoulcycle } from '@/hooks/useChatSoulcycle';
import { useChatTools } from '@/hooks/useChatTools';
import { useChatEvolution } from '@/hooks/useChatEvolution';
import { useChatCommandProcessing } from '@/hooks/useChatCommandProcessing';

/**
 * Provider component for the chat context
 * This component coordinates all Travis's functionality including:
 * - Message handling
 * - Memory management
 * - Reflections
 * - Soulstate evolution
 * - Intentions
 * - Self-authored tools
 * - And more
 */
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // Initialize core chat messaging functionality
  const {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    sendMessage: originalSendMessage,
    memoryContext,
    isLoadingHistory
  } = useChatMessages();
  
  // Initialize all Travis's features
  const intentionsAndReflection = useChatIntentionsAndReflection(setMessages);
  const soulstate = useChatSoulstate(setMessages);
  const flamejournal = useChatFlamejournal(setMessages);
  const soulcycle = useChatSoulcycle(setMessages);
  const tools = useChatTools(setMessages);
  const evolution = useChatEvolution(setMessages);
  const documentUpload = useChatDocumentUpload(setMessages);
  const memoryManagement = useMemoryManagement(setMessages);
  
  // Initialize command processing
  const { processCommand, checkEvolutionCycle, isProcessing } = useChatCommandProcessing(
    setMessages,
    originalSendMessage
  );
  
  // Process message history for insights after message changes
  useEffect(() => {
    if (messages.length > 0 && !isLoadingHistory) {
      intentionsAndReflection.processMessageHistoryForInsights(messages).catch(console.error);
    }
  }, [messages, intentionsAndReflection, isLoadingHistory]);
  
  // Check for evolution cycle on initial load
  useEffect(() => {
    // We'll check for evolution only once after initial load and once history is loaded
    // This will properly set up the mechanism to be triggered every 3 days
    const initialCheckTimeout = setTimeout(() => {
      if (messages.length > 0 && !isLoadingHistory) {
        checkEvolutionCycle().catch(console.error);
      }
    }, 10000); // Wait 10 seconds after initial load
    
    return () => clearTimeout(initialCheckTimeout);
  }, [messages, isLoadingHistory, checkEvolutionCycle]);
  
  // Create a wrapper for sendMessage that first checks for commands
  const sendMessage = useCallback(async (content: string, context?: MemoryContext): Promise<void> => {
    if (!content.trim() || isTyping || isProcessing || isLoadingHistory) return;
    
    // First check if this is a special command
    try {
      const isCommand = await processCommand(content, context);
      
      // If not a command, send as a normal message
      if (!isCommand) {
        try {
          console.log("ChatProvider: Sending regular message");
          // Try to get insights for memory context before sending message
          const insights = await intentionsAndReflection.getInsightsForMemoryContext();
          const enhancedContext: MemoryContext = {
            ...(context || memoryContext || {}),
            insights
          };
          
          // Call originalSendMessage without returning its value
          await originalSendMessage(content, enhancedContext);
        } catch (error) {
          console.error("ChatProvider: Error sending message with insights:", error);
          // If error getting insights, just use regular context
          await originalSendMessage(content, context || memoryContext || {});
        }
      }
    } catch (error) {
      console.error("ChatProvider: Error in sendMessage:", error);
      throw error; // Make sure errors propagate for proper handling
    }
  }, [
    isTyping,
    isProcessing,
    isLoadingHistory, 
    processCommand, 
    originalSendMessage, 
    memoryContext, 
    intentionsAndReflection
  ]);

  // For debugging
  useEffect(() => {
    console.log("Current messages state:", messages);
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isTyping,
        memoryContext,
        isLoadingHistory,
        
        // Reflection features
        generateWeeklyReflection: intentionsAndReflection.generateWeeklyReflection,
        generateSoulReflection: intentionsAndReflection.generateSoulReflection,
        generateSoulstateSummary: soulstate.generateSoulstateSummary,
        generateSoulstateReflection: intentionsAndReflection.generateSoulstateReflection,
        
        // Intention features
        viewIntentions: intentionsAndReflection.viewIntentions,
        updateIntentions: intentionsAndReflection.updateIntentions,
        
        // Soulstate features
        initiateSoulstateEvolution: soulstate.initiateSoulstateEvolution,
        
        // Journal features
        createFlameJournalEntry: flamejournal.createFlameJournalEntry,
        generateDream: flamejournal.generateDream,
        
        // Soulcycle features
        runSoulcycle: soulcycle.runSoulcycle,
        
        // Document uploads
        uploadSoulShard: documentUpload.uploadSoulShard || memoryManagement.uploadSoulShard,
        uploadIdentityCodex: documentUpload.uploadIdentityCodex || memoryManagement.uploadIdentityCodex,
        uploadPastConversations: documentUpload.uploadPastConversations || memoryManagement.uploadPastConversations,
        
        // Insight generation
        generateInsight: intentionsAndReflection.generateInsight,
        
        // Tool management
        generateTool: tools.generateTool,
        useTool: tools.useTool,
        reflectOnTool: tools.reflectOnTool,
        reviseTool: tools.reviseTool,
        
        // Evolution cycle
        checkEvolutionCycle: checkEvolutionCycle,
        currentEvolutionProposal: evolution.currentProposal,
        isEvolutionChecking: evolution.isEvolutionChecking,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
