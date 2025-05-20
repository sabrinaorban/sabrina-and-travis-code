
import { useCallback } from 'react';
import { Message } from '../types';
import { useContextualLearning } from './useContextualLearning';
import { useAuth } from '@/contexts/AuthContext';
import { storeAssistantMessage } from '../services/ChatService';
import { useToast } from './use-toast';

export const useInsights = () => {
  const { analyzeConversationPatterns, retrieveInsights, generateInsightReflection } = useContextualLearning();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Process messages to detect patterns and generate insights - with better error handling
  const processMessageHistoryForInsights = useCallback(async (messages: Message[]) => {
    if (!user) {
      console.log("Cannot process insights: No authenticated user");
      return;
    }
    
    try {
      // Only process if there are enough back-and-forth exchanges
      // We check for at least 20 messages with a ratio of user messages
      const userMessages = messages.filter(m => m.role === 'user');
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      
      // Need at least 20 total messages and 8 user messages for meaningful analysis
      if (messages.length >= 20 && userMessages.length >= 8) {
        console.log(`Processing ${messages.length} messages (${userMessages.length} user messages) for insights`);
        
        // Add safeguard to prevent redundant processing by checking only recent messages
        // Get last 30 messages for analysis to keep API calls smaller
        const recentMessages = messages.slice(-30);
        
        try {
          const insights = await analyzeConversationPatterns(recentMessages);
          console.log(`Generated ${insights?.length || 0} insights from conversation`);
          return insights;
        } catch (error) {
          console.error('Error from conversation-insights function:', error);
          
          // Fixed: Remove the second argument to toast() function
          toast({
            title: 'Insight Analysis',
            description: 'Could not analyze conversation patterns at this time.',
            variant: 'destructive',
          });
          
          return [];
        }
      } else {
        console.log(`Not enough meaningful messages (${messages.length} total, ${userMessages.length} user messages) to generate insights`);
        return [];
      }
    } catch (error) {
      console.warn('Error processing message history for insights:', error);
      return [];
    }
  }, [user, analyzeConversationPatterns, toast]);
  
  // Get insights to enhance memory context
  const getInsightsForMemoryContext = useCallback(async () => {
    try {
      if (!user) return [];
      
      const insights = await retrieveInsights(3, 0.65);
      console.log(`Retrieved ${insights.length} insights for memory context`);
      return insights;
    } catch (error) {
      console.warn('Error getting insights for memory context:', error);
      return [];
    }
  }, [retrieveInsights, user]);
  
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
      toast({
        title: 'Insight Generation',
        description: 'Unable to generate insights at this time.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, generateInsightReflection, toast]);
  
  return {
    processMessageHistoryForInsights,
    getInsightsForMemoryContext,
    generateInsightMessage
  };
};
