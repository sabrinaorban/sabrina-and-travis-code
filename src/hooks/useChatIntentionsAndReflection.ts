
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
  
  // Add flamejournal for reflection entries
  const { createJournalEntry } = useFlamejournal();

  // Add soulstate management
  const {
    initiateSoulstateEvolution,
    generateSoulstateSummary
  } = useChatSoulstate(setMessages);
  
  // Add soulcycle functionality
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
    getInsightsForMemoryContext
  };
};
