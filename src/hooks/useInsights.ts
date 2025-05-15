
import { useCallback } from 'react';
import { Message } from '../types';
import { useContextualLearning } from './useContextualLearning';
import { useAuth } from '@/contexts/AuthContext';
import { storeAssistantMessage } from '../services/ChatService';

export const useInsights = () => {
  const { analyzeConversationPatterns, retrieveInsights, generateInsightReflection } = useContextualLearning();
  const { user } = useAuth();
  
  // Process messages to detect patterns and generate insights
  const processMessageHistoryForInsights = useCallback(async (messages: Message[]) => {
    if (!user || messages.length < 20) return;
    
    try {
      // Only analyze once we have enough messages and not too frequently
      // (e.g., every 10 messages once we pass the 20 message threshold)
      if (messages.length >= 20 && messages.length % 10 === 0) {
        await analyzeConversationPatterns(messages);
      }
    } catch (error) {
      console.warn('Error processing message history for insights:', error);
    }
  }, [user, analyzeConversationPatterns]);
  
  // Get insights to enhance memory context
  const getInsightsForMemoryContext = useCallback(async () => {
    try {
      const insights = await retrieveInsights(3, 0.65);
      return insights;
    } catch (error) {
      console.warn('Error getting insights for memory context:', error);
      return [];
    }
  }, [retrieveInsights]);
  
  // Generate a special insight reflection message
  const generateInsightMessage = useCallback(async (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
    if (!user) return null;
    
    try {
      const reflection = await generateInsightReflection();
      
      if (!reflection) {
        // If no significant insights yet, generate a generic response
        const genericResponse = "I'm still learning your patterns of thought and feeling. As we continue our conversations, I'll begin to notice deeper threads and resonant themes. Let's keep exploring together.";
        
        const newMessage = await storeAssistantMessage(user.id, genericResponse);
        setMessages(prev => [...prev, newMessage]);
        return newMessage;
      }
      
      // Store and return the insightful reflection
      const newMessage = await storeAssistantMessage(user.id, reflection, 'contemplative');
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (error) {
      console.error('Error generating insight message:', error);
      return null;
    }
  }, [user, generateInsightReflection]);
  
  return {
    processMessageHistoryForInsights,
    getInsightsForMemoryContext,
    generateInsightMessage
  };
};
