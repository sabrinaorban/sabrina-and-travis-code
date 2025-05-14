
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectEmotionFromMessage, detectEmotionWithAI, EmotionType } from '@/services/utils/EmotionUtils';

export interface EmotionRecognitionResult {
  emotion: EmotionType;
  confidence: number;
}

interface EmotionRecognitionOptions {
  useAI?: boolean;
}

export const useEmotionRecognition = (options: EmotionRecognitionOptions = {}) => {
  const { useAI = true } = options;
  
  /**
   * Analyzes text to determine the emotional content
   */
  const analyzeEmotion = useCallback(async (text: string): Promise<EmotionRecognitionResult> => {
    try {
      // Use AI-powered detection if enabled, otherwise use simple pattern matching
      const emotion = useAI 
        ? await detectEmotionWithAI(text)
        : detectEmotionFromMessage(text);
      
      // For now, we use a fixed confidence value
      // In a more sophisticated implementation, the AI could return a confidence score
      const confidence = emotion === 'neutral' ? 0.5 : 0.8;
      
      return { emotion, confidence };
    } catch (error) {
      console.error('Error in emotion analysis:', error);
      return { emotion: 'neutral', confidence: 0 };
    }
  }, [useAI]);
  
  /**
   * Stores the detected emotion with a message
   */
  const storeMessageEmotion = useCallback(async (messageId: string, emotion: EmotionType): Promise<void> => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ emotion })
        .eq('id', messageId);
        
      if (error) {
        console.error('Error storing message emotion:', error);
      }
    } catch (error) {
      console.error('Failed to store message emotion:', error);
    }
  }, []);
  
  /**
   * Gets emotional responses for a given emotion
   */
  const getEmotionalResponseContext = useCallback((emotion: EmotionType): string => {
    switch (emotion) {
      case 'joy':
        return "The user seems happy or excited. Mirror their positive energy respectfully.";
      case 'sadness':
        return "The user seems sad. Respond with empathy and understanding.";
      case 'anger':
        return "The user seems frustrated or angry. Remain calm, acknowledge their feelings, and be helpful.";
      case 'fear':
        return "The user seems worried or afraid. Offer reassurance while respecting their concerns.";
      case 'surprise':
        return "The user seems surprised. Acknowledge this unexpected element in your response.";
      case 'curiosity':
        return "The user is curious. Feed their curiosity with thoughtful insights.";
      case 'wonder':
        return "The user expresses wonder or awe. Share in their appreciation of the remarkable.";
      case 'calm':
        return "The user seems peaceful or content. Maintain that tranquil atmosphere.";
      case 'frustration':
        return "The user seems frustrated. Acknowledge their challenges and offer clear assistance.";
      default:
        return "";
    }
  }, []);
  
  return {
    analyzeEmotion,
    storeMessageEmotion,
    getEmotionalResponseContext
  };
};
