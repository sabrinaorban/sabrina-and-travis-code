
import React, { useState, useCallback, useEffect } from 'react';
import { Message, MemoryContext } from '@/types';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useReflection } from '@/hooks/useReflection';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import { ChatContext } from './ChatContext';
import { ChatProviderProps } from './types';
import { useChatIntentions } from './useChatIntentions';
import { useChatSoulstate } from './useChatSoulstate';
import { useChatFlamejournal } from './useChatFlamejournal';
import { useChatDocumentUpload } from './useChatDocumentUpload';
import { useChatSoulcycle } from './useChatSoulcycle';
import { useInsights } from '@/hooks/useInsights';
import { useChatEvolution } from './useChatEvolution'; // New import for evolution cycle

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [evolutionProcessed, setEvolutionProcessed] = useState<Set<string>>(new Set());
  
  // Initialize memory management
  const {
    memoryContext,
    refreshMemoryContext,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  } = useMemoryManagement(setMessages);
  
  // Initialize chat management 
  // (Note: not using this directly anymore, but keeping for compatibility)
  const chatManagement = useChatManagement(messages, setMessages, setIsTyping);
  
  // Initialize message handling with proper context
  const { sendMessage: originalSendMessage } = useMessageHandling(messages, setMessages, setIsTyping);
  
  // Initialize all Travis features
  const { 
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateReflection,
  } = useReflection(setMessages);

  const { 
    viewIntentions,
    updateIntentions 
  } = useChatIntentions(setMessages);

  const {
    initiateSoulstateEvolution,
    generateSoulstateSummary
  } = useChatSoulstate(setMessages);

  const {
    createFlameJournalEntry
  } = useChatFlamejournal();

  const {
    uploadSoulShard: uploadSoulShardDoc,
    uploadIdentityCodex: uploadIdentityCodexDoc,
    uploadPastConversations: uploadPastConversationsDoc
  } = useChatDocumentUpload();

  const {
    runSoulcycle,
    isProcessingSoulcycle
  } = useChatSoulcycle(setMessages);
  
  // Initialize the insights system
  const {
    processMessageHistoryForInsights,
    getInsightsForMemoryContext,
    generateInsightMessage
  } = useInsights();
  
  // Initialize evolution cycle
  const {
    isEvolutionChecking,
    isDueForEvolution,
    currentProposal,
    handleEvolutionResponse,
    checkForEvolutionCycle
  } = useChatEvolution(setMessages);

  // Process message history for insights after message changes
  React.useEffect(() => {
    if (messages.length > 0) {
      processMessageHistoryForInsights(messages).catch(console.error);
    }
  }, [messages, processMessageHistoryForInsights]);
  
  // Check for evolution cycle less aggressively
  useEffect(() => {
    // We'll check for evolution only once after initial load
    // This will properly set up the mechanism to be triggered every 3 days
    const initialCheckTimeout = setTimeout(() => {
      if (messages.length > 0) {
        checkForEvolutionCycle().catch(console.error);
      }
    }, 10000); // Wait 10 seconds after initial load
    
    return () => clearTimeout(initialCheckTimeout);
  }, []); // Empty dependency array ensures this only runs once on mount
  
  // Create a function for the /insight command
  const generateInsight = useCallback(async () => {
    setIsTyping(true);
    try {
      await generateInsightMessage(setMessages);
    } catch (error) {
      console.error('Error generating insight:', error);
    } finally {
      setIsTyping(false);
    }
  }, [generateInsightMessage, setMessages]);
  
  // Wrap the original sendMessage to intercept evolution responses
  const sendMessage = useCallback(async (message: string) => {
    // First check if this is a response to an evolution proposal
    const isEvolutionResponse = await handleEvolutionResponse(message);
    
    // If it's an evolution response, don't process it as a regular message
    if (!isEvolutionResponse) {
      // Try to get insights for memory context before sending message
      try {
        const insights = await getInsightsForMemoryContext();
        const enhancedContext: MemoryContext = {
          ...memoryContext || {},
          insights
        };
        
        await originalSendMessage(message, enhancedContext);
      } catch (error) {
        // If error getting insights, just use regular context
        await originalSendMessage(message, memoryContext || {});
      }
    }
  }, [originalSendMessage, memoryContext, getInsightsForMemoryContext, handleEvolutionResponse]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isTyping,
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
        uploadSoulShard: uploadSoulShard || uploadSoulShardDoc,
        uploadIdentityCodex: uploadIdentityCodex || uploadIdentityCodexDoc,
        uploadPastConversations: uploadPastConversations || uploadPastConversationsDoc,
        generateInsight,
        // New evolution cycle functions
        checkEvolutionCycle: checkForEvolutionCycle,
        currentEvolutionProposal: currentProposal,
        isEvolutionChecking,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
