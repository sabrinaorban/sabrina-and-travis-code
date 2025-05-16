import { useState, useCallback } from 'react';
import { Message, Insight } from '../types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export const useContextualLearning = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Analyze patterns in recent conversations
  const analyzeConversationPatterns = useCallback(async (
    messages: Message[],
    threshold = 20 // minimum messages to analyze
  ): Promise<Insight[]> => {
    if (!user || messages.length < threshold) {
      return [];
    }

    setIsProcessing(true);
    try {
      // Filter to user messages only for analysis
      const userMessages = messages.filter(m => m.role === 'user');
      
      // Get last 30 user messages for pattern analysis
      const recentUserMessages = userMessages.slice(-30);
      
      // Call Supabase Edge Function to analyze patterns
      const { data: insights, error } = await supabase.functions.invoke('conversation-insights', {
        body: { 
          messages: recentUserMessages,
          userId: user.id
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Store insights in database if they don't exist yet
      if (insights && insights.length > 0) {
        await storeInsights(insights);
      }
      
      return insights || [];
    } catch (error) {
      console.error('Error analyzing conversation patterns:', error);
      toast({
        title: 'Analysis Error',
        description: 'Could not analyze conversation patterns.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [user, toast]);

  // Store insights in the database
  const storeInsights = useCallback(async (insights: any[]): Promise<void> => {
    if (!user || !insights.length) return;

    try {
      for (const insight of insights) {
        // Check if a similar insight already exists
        const { data: existingInsights } = await supabase
          .from('conversation_insights')
          .select('*')
          .eq('user_id', user.id)
          .ilike('summary', `%${insight.summary?.substring(0, 20) || ''}%`)
          .maybeSingle();

        if (existingInsights) {
          // Update existing insight
          await supabase
            .from('conversation_insights')
            .update({
              last_detected: new Date().toISOString(),
              times_detected: (existingInsights.times_detected || 1) + 1,
              confidence: Math.min(0.95, (existingInsights.confidence || 0.5) + 0.1), // Increase confidence but cap at 0.95
            })
            .eq('id', existingInsights.id);
        } else {
          // Insert new insight
          await supabase
            .from('conversation_insights')
            .insert({
              user_id: user.id,
              content: insight.content || insight.summary || 'Insight detected',
              created_at: new Date().toISOString(),
              summary: insight.summary,
              emotional_theme: insight.emotionalTheme,
              growth_edge: insight.growthEdge,
              resonance_pattern: insight.resonancePattern,
              last_detected: insight.lastDetected || new Date().toISOString(),
              confidence: insight.confidence || 0.5,
            });
        }
      }
    } catch (error) {
      console.error('Error storing insights:', error);
    }
  }, [user]);

  // Retrieve stored insights
  const retrieveInsights = useCallback(async (
    limit = 5,
    confidenceThreshold = 0.5
  ): Promise<Insight[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('conversation_insights')
        .select('*')
        .eq('user_id', user.id)
        .gt('confidence', confidenceThreshold)
        .order('last_detected', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        content: item.content || item.summary || 'Insight',
        created_at: item.created_at,
        summary: item.summary,
        emotionalTheme: item.emotional_theme,
        growthEdge: item.growth_edge,
        resonancePattern: item.resonance_pattern,
        lastDetected: item.last_detected,
        timesDetected: item.times_detected,
        confidence: item.confidence,
      })) as Insight[];
    } catch (error) {
      console.error('Error retrieving insights:', error);
      return [];
    }
  }, [user]);

  // Generate a reflection from insight
  const generateInsightReflection = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      // Get a significant insight
      const insights = await retrieveInsights(3, 0.6);
      if (!insights.length) return null;
      
      // Use the most recent significant insight
      const primaryInsight = insights[0];
      
      // Call Supabase Edge Function to generate a poetic insight reflection
      const { data, error } = await supabase.functions.invoke('insight-reflection', {
        body: { 
          insight: primaryInsight,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      return data?.reflection || null;
    } catch (error) {
      console.error('Error generating insight reflection:', error);
      return null;
    }
  }, [user, retrieveInsights]);

  return {
    analyzeConversationPatterns,
    storeInsights,
    retrieveInsights,
    generateInsightReflection: async (): Promise<string | null> => {
      // Implementation would be here
      return null;
    },
    isProcessing,
  };
};
