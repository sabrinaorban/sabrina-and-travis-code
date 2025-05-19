
import { useCallback } from 'react';
import { Message } from '@/types';
import { useChatIntentions } from '@/contexts/chat/useChatIntentions';
import { useChatReflection } from './useChatReflection';
import { useInsights } from './useInsights';
import { useToast } from './use-toast';
import { useChatSoulstate } from '@/contexts/chat/useChatSoulstate';
import { useChatSoulcycle } from '@/contexts/chat/useChatSoulcycle';
import { useChatDocumentUpload } from '@/contexts/chat/useChatDocumentUpload';

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

  // Add soulstate management
  const {
    initiateSoulstateEvolution,
    generateSoulstateSummary
  } = useChatSoulstate(setMessages);
  
  // Add soulcycle functionality - ensure Promise<void> return type
  const { runSoulcycle } = useChatSoulcycle(setMessages);
  
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
    } catch (error) {
      console.error('Error generating insight:', error);
      toast({
        title: 'Insight Generation Failed',
        description: 'Unable to generate insights at this time',
        variant: 'destructive',
      });
    }
  }, [generateInsightMessage, setMessages, toast]);
  
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
