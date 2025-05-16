
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
import { Intention } from '@/types/intentions';
import { SoulstateProposal } from '@/types/soulstate';

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // Initialize core chat messaging functionality
  const {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    sendMessage: originalSendMessage,
    memoryContext,
    isLoadingHistory,
    refreshMessages
  } = useChatMessages();
  
  // Track initialization status
  const [isInitialized, setIsInitialized] = useState(false);
  
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
    if (messages.length > 0 && !isLoadingHistory && isInitialized) {
      intentionsAndReflection.processMessageHistoryForInsights(messages).catch(console.error);
    }
  }, [messages, intentionsAndReflection, isLoadingHistory, isInitialized]);
  
  // Mark as initialized once history is loaded
  useEffect(() => {
    if (!isLoadingHistory && !isInitialized) {
      console.log("Chat system initialization complete");
      setIsInitialized(true);
    }
  }, [isLoadingHistory, isInitialized]);
  
  // Check for evolution cycle on initial load
  useEffect(() => {
    // We'll check for evolution only once after initial load and once history is loaded
    // This will properly set up the mechanism to be triggered every 3 days
    if (isInitialized && messages.length > 0) {
      const initialCheckTimeout = setTimeout(() => {
        checkEvolutionCycle().catch(console.error);
      }, 10000); // Wait 10 seconds after initialization
      
      return () => clearTimeout(initialCheckTimeout);
    }
  }, [isInitialized, messages, checkEvolutionCycle]);
  
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
          
          // Extract the content strings from insights for the memoryContext
          const insightContents = insights ? insights.map(insight => insight.content) : [];
          
          const enhancedContext: MemoryContext = {
            ...(context || memoryContext || {}),
            insights: insightContents
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
  
  // Wrapper functions to convert types to match our interface
  const viewIntentionsWrapper = useCallback(async (): Promise<void> => {
    await intentionsAndReflection.viewIntentions();
  }, [intentionsAndReflection]);

  const createFlameJournalEntryWrapper = useCallback(async (prompt?: string): Promise<void> => {
    await flamejournal.createFlameJournalEntry(prompt);
  }, [flamejournal]);

  const generateDreamWrapper = useCallback(async (): Promise<void> => {
    await flamejournal.generateDream();
  }, [flamejournal]);
  
  const runSoulcycleWrapper = useCallback(async (): Promise<void> => {
    await soulcycle.runSoulcycle();
  }, [soulcycle]);
  
  // Helper function to read file as text
  const readFileAsText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };
  
  const uploadSoulShardWrapper = useCallback(async (content: File): Promise<void> => {
    if (documentUpload.uploadSoulShard) {
      await documentUpload.uploadSoulShard(content);
    } else if (memoryManagement.uploadSoulShard) {
      await memoryManagement.uploadSoulShard(content);
    }
  }, [documentUpload, memoryManagement]);
  
  const uploadIdentityCodexWrapper = useCallback(async (content: File): Promise<void> => {
    if (documentUpload.uploadIdentityCodex) {
      await documentUpload.uploadIdentityCodex(content);
    } else if (memoryManagement.uploadIdentityCodex) {
      await memoryManagement.uploadIdentityCodex(content);
    }
  }, [documentUpload, memoryManagement]);
  
  const uploadPastConversationsWrapper = useCallback(async (content: File): Promise<void> => {
    if (documentUpload.uploadPastConversations) {
      await documentUpload.uploadPastConversations(content);
    } else if (memoryManagement.uploadPastConversations) {
      await memoryManagement.uploadPastConversations(content);
    }
  }, [documentUpload, memoryManagement]);

  // Tool wrappers
  const useToolWrapper = useCallback(async (toolId: string, input?: string): Promise<void> => {
    await tools.useTool(toolId);
  }, [tools]);
  
  const reflectOnToolWrapper = useCallback(async (toolId: string): Promise<void> => {
    await tools.reflectOnTool(toolId);
  }, [tools]);
  
  const reviseToolWrapper = useCallback(async (toolId: string, changes?: string): Promise<void> => {
    await tools.reviseTool(toolId);
  }, [tools]);

  // Convert EvolutionProposal to SoulstateProposal if needed
  const convertToSoulstateProposal = (evolutionProposal: any): SoulstateProposal | undefined => {
    if (!evolutionProposal) return undefined;
    
    // Extract the soulstate evolution part from the evolution proposal
    const soulstateEvolution = evolutionProposal.soulstateEvolution;
    
    // If there's no soulstate evolution data, return undefined
    if (!soulstateEvolution) return undefined;
    
    // Create a SoulstateProposal object with the required fields
    return {
      id: evolutionProposal.id || crypto.randomUUID(),
      currentState: soulstateEvolution.currentState || {},
      proposedChanges: soulstateEvolution.proposedState || {},
      reasoning: evolutionProposal.message || "Evolution based on recent interactions",
      created_at: evolutionProposal.timestamp || new Date().toISOString()
    };
  };

  // Modified wrapper to handle return types
  const generateToolWrapper = useCallback(async (purpose?: string): Promise<void> => {
    if (tools.generateTool) {
      await tools.generateTool(purpose || "");
    }
  }, [tools]);

  const checkEvolutionCycleWrapper = useCallback(async (): Promise<void> => {
    if (checkEvolutionCycle) {
      await checkEvolutionCycle();
    }
  }, [checkEvolutionCycle]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isTyping,
        memoryContext,
        isLoadingHistory,
        refreshMessages,
        
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
        currentEvolutionProposal: evolution.currentProposal 
          ? {
              id: evolution.currentProposal.id || crypto.randomUUID(),
              currentState: evolution.currentProposal.soulstateEvolution?.currentState || {},
              proposedChanges: evolution.currentProposal.soulstateEvolution?.proposedState || {},
              reasoning: evolution.currentProposal.message || "Evolution based on recent interactions",
              created_at: evolution.currentProposal.timestamp || new Date().toISOString()
            }
          : undefined,
        isEvolutionChecking: evolution.isEvolutionChecking,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
