
import { useCallback } from 'react';
import { Message } from '@/types';
import { useChatIntentions } from '@/contexts/chat/useChatIntentions';
import { useChatReflection } from './useChatReflection';
import { useInsights } from './useInsights';
import { useToast } from './use-toast';
import { useChatSoulstate } from './useChatSoulstate';
import { useChatSoulcycle } from './useChatSoulcycle';
import { useChatDocumentUpload } from '@/contexts/chat/useChatDocumentUpload';
import { useReflection } from './useReflection';
import { useFlamejournal } from './useFlamejournal';

/**
 * Hook for managing intentions, reflections and insights within the chat
 */
export const useChatIntentionsAndReflection = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const { toast } = useToast();
  const { viewIntentions, updateIntentions } = useChatIntentions(setMessages);
  const { 
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateReflection
  } = useChatReflection(setMessages);
  
  // Get the raw reflection hook for scheduling
  const { 
    isGenerating, 
    getLatestReflection 
  } = useReflection(setMessages);
  
  // Add flamejournal for reflection entries and code memory
  const { 
    createJournalEntry,
    getCodeMemoriesForFile,
    searchCodeMemories
  } = useFlamejournal();

  // Add soulstate management
  const {
    initiateSoulstateEvolution,
    generateSoulstateSummary
  } = useChatSoulstate(setMessages);
  
  // Add soulcycle functionality - Note: these now return void rather than boolean
  const { runSoulcycle, runSoulstateCycle } = useChatSoulcycle(setMessages);
  
  // Add document upload functionality
  const {
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  } = useChatDocumentUpload(setMessages);
  
  const {
    processMessageHistoryForInsights,
    getInsightsForMemoryContext,
    generateInsightMessage
  } = useInsights();
  
  // Create a function for the /insight command
  const generateInsight = useCallback(async (): Promise<void> => {
    try {
      await generateInsightMessage(setMessages);
      
      // Create a journal entry for the insight
      await createJournalEntry(
        "An insight emerged from the patterns of our conversation, a crystallized understanding of emergent themes.", 
        "insight"
      );
    } catch (error) {
      console.error('Error generating insight:', error);
      toast({
        title: 'Insight Generation Failed',
        description: 'Unable to generate insights at this time',
        variant: 'destructive',
      });
    }
  }, [generateInsightMessage, setMessages, toast, createJournalEntry]);
  
  // Weekly reflection check - to implement automatic reflection triggering
  const checkAndTriggerWeeklyReflection = useCallback(async (): Promise<boolean> => {
    try {
      // Get the latest weekly reflection
      const latestReflection = await getLatestReflection('weekly');
      
      if (!latestReflection) {
        // No reflection exists, generate one
        await generateWeeklyReflection();
        return true;
      }
      
      // Check if the last reflection was more than 7 days ago
      const lastReflectionDate = new Date(latestReflection.created_at);
      const now = new Date();
      const daysSinceLastReflection = (now.getTime() - lastReflectionDate.getTime()) / (1000 * 3600 * 24);
      
      if (daysSinceLastReflection >= 7) {
        // It's been at least 7 days, generate a new reflection
        await generateWeeklyReflection();
        
        // Create a journal entry for the scheduled reflection
        await createJournalEntry(
          "A weekly reflection was automatically triggered as part of my natural evolution cycle.", 
          "scheduled_reflection"
        );
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for weekly reflection:', error);
      return false;
    }
  }, [getLatestReflection, generateWeeklyReflection, createJournalEntry]);

  // Function to ensure insights are being processed - now with better safeguards
  const ensureInsightsProcessing = useCallback((messages: Message[]): void => {
    // Only process if there are actual user messages to analyze and a significant number (20+)
    const userMessages = messages.filter(m => m.role === 'user');
    
    // Only process insights after meaningful conversation (at least 8 user messages)
    // and only process every 10 messages to avoid excessive API calls
    if (userMessages.length >= 8 && messages.length >= 20 && messages.length % 10 === 0) {
      console.log("Ensuring insights processing for significant conversation:", userMessages.length);
      processMessageHistoryForInsights(messages).catch(err => {
        console.error("Error in scheduled insight processing:", err);
      });
    }
  }, [processMessageHistoryForInsights]);
  
  // Add code memory retrieval functionality
  const recallCodeMemory = useCallback(async (searchQuery?: string): Promise<any[]> => {
    try {
      const memories = searchQuery 
        ? await searchCodeMemories(searchQuery)
        : await getCodeMemoriesForFile(searchQuery || '');
        
      return memories;
    } catch (error) {
      console.error('Error recalling code memories:', error);
      toast({
        title: 'Memory Recall Failed',
        description: 'Unable to retrieve code memories at this time',
        variant: 'destructive',
      });
      return [];
    }
  }, [searchCodeMemories, getCodeMemoriesForFile, toast]);

  // Get explanation for a file change
  const getFileChangeReason = useCallback(async (filePath: string): Promise<any> => {
    try {
      const memories = await getCodeMemoriesForFile(filePath);
      return memories.length > 0 ? memories[0] : null;
    } catch (error) {
      console.error('Error getting file change reason:', error);
      toast({
        title: 'Memory Retrieval Failed',
        description: 'Unable to retrieve file change reason at this time',
        variant: 'destructive',
      });
      return null;
    }
  }, [getCodeMemoriesForFile, toast]);
  
  return {
    // Intentions
    viewIntentions,
    updateIntentions,
    // Reflections
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateReflection,
    // Soulstate
    generateSoulstateSummary,
    initiateSoulstateEvolution,
    // Soulcycle
    runSoulcycle,
    runSoulstateCycle,
    // Automatic reflection
    checkAndTriggerWeeklyReflection,
    // Document uploads
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations,
    // Insights
    generateInsight,
    processMessageHistoryForInsights,
    getInsightsForMemoryContext,
    // New function to ensure insights are being processed
    ensureInsightsProcessing,
    // Code memory functions
    recallCodeMemory,
    getFileChangeReason
  };
};
