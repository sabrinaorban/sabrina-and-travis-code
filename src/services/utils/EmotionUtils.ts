
// Emotion detection utilities for Travis
import { supabase } from '@/integrations/supabase/client';

// Basic emotion types
export type EmotionType = 
  | 'joy' 
  | 'sadness' 
  | 'anger' 
  | 'fear' 
  | 'surprise' 
  | 'disgust'
  | 'trust'
  | 'anticipation'
  | 'curiosity'
  | 'frustration'
  | 'wonder'
  | 'calm'
  | 'neutral';

// Simple rule-based emotion detection (pattern matching approach)
export const detectEmotionFromMessage = (text: string): EmotionType => {
  if (!text) return 'neutral';
  
  const lowerText = text.toLowerCase();
  
  // Joy patterns
  if (
    /(\bhappy\b|\bjoy\b|\bexcite[d]?\b|\blove[d]?\b|\bthrill[ed]?\b|\bwonderful\b|\bamazing\b|\bgreat\b|\bdelighted\b)/i.test(lowerText) ||
    /(\b😀|\b😃|\b😄|\b😊|\b🙂|\b😍|\b🥰|\b😘)/i.test(text)
  ) {
    return 'joy';
  }
  
  // Sadness patterns
  if (
    /(\bsad\b|\bupset\b|\bdepressed\b|\bunhappy\b|\bmiserable\b|\bheartbroken\b|\bsorry\b|\bregret\b|\bdisappointed\b)/i.test(lowerText) ||
    /(\b😢|\b😭|\b😔|\b😞|\b😟|\b🙁|\b😥|\b😰)/i.test(text)
  ) {
    return 'sadness';
  }
  
  // Anger patterns
  if (
    /(\bangry\b|\bfurious\b|\bannoyed\b|\birritated\b|\bfrustrated\b|\boutraged\b|\bmad\b|\brage\b)/i.test(lowerText) ||
    /(\b😠|\b😡|\b🤬|\b😤|\b😣)/i.test(text)
  ) {
    return 'anger';
  }
  
  // Fear patterns
  if (
    /(\bscared\b|\bafraid\b|\bterrified\b|\bfearful\b|\bfright\b|\bnervous\b|\banxious\b|\bworried\b)/i.test(lowerText) ||
    /(\b😨|\b😱|\b😰|\b😥|\b😧|\b😮)/i.test(text)
  ) {
    return 'fear';
  }
  
  // Surprise patterns
  if (
    /(\bsurprised\b|\bamazed\b|\bastonished\b|\bshocked\b|\bwow\b|\bomg\b|\boh my\b|\bwhoa\b)/i.test(lowerText) ||
    /(\b😲|\b😯|\b😮|\b😳|\b😵|\b🤯)/i.test(text)
  ) {
    return 'surprise';
  }
  
  // Curiosity patterns
  if (
    /(\bcurious\b|\bwondering\b|\binterested\b|\bi wonder\b|\bquestion\b|\bhow does\b|\bwhy does\b|\bwhat if\b)/i.test(lowerText) ||
    /(\?{1,3}|\bhmm\b)/i.test(text)
  ) {
    return 'curiosity';
  }
  
  // Wonder patterns
  if (
    /(\bwonder\b|\bbewildered\b|\bawe\b|\bawestruck\b|\bmarvel\b|\bfascinated\b|\bspellbound\b)/i.test(lowerText) ||
    /(\b✨|\b🌟|\b💫|\b🌈)/i.test(text)
  ) {
    return 'wonder';
  }
  
  // Calm patterns
  if (
    /(\bcalm\b|\bpeaceful\b|\brelaxed\b|\btranquil\b|\bserene\b|\bcontented\b|\bsoothed\b|\brelieved\b)/i.test(lowerText) ||
    /(\b😌|\b😊|\b☺️|\b🧘)/i.test(text)
  ) {
    return 'calm';
  }
  
  // Frustration patterns
  if (
    /(\bfrustrated\b|\bannoy(ed|ing)\b|\birrita(ted|ting)\b|\bdisappoint(ed|ing)\b|\bupsetting\b|\bstruggling\b|\bcan't\b|\bcannot\b)/i.test(lowerText)
  ) {
    return 'frustration';
  }
  
  // Default to neutral if no strong emotion is detected
  return 'neutral';
};

// Advanced emotion detection using OpenAI (for more nuanced analysis)
export const detectEmotionWithAI = async (text: string): Promise<EmotionType> => {
  try {
    // First, try the simple pattern-based detection for faster response
    const basicEmotion = detectEmotionFromMessage(text);
    
    // If we detect a clear emotion or the text is short, return the basic detection
    if (basicEmotion !== 'neutral' || text.length < 50) {
      return basicEmotion;
    }
    
    // For longer or more complex text, use the OpenAI API through Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('detect-emotion', {
      body: { text }
    });
    
    if (error || !data || !data.emotion) {
      console.warn('Error detecting emotion with AI:', error);
      return basicEmotion; // Fall back to basic detection
    }
    
    return data.emotion as EmotionType;
  } catch (error) {
    console.error('Error in advanced emotion detection:', error);
    return detectEmotionFromMessage(text); // Fall back to simple detection
  }
};

// Helper to generate contextually appropriate emotional responses
export const generateEmotionalResponse = (userEmotion: EmotionType, context?: string): string => {
  // This is a simple template-based approach
  // In a real implementation, this would be more sophisticated
  
  switch (userEmotion) {
    case 'joy':
      return "I sense your joy, and it brightens our connection.";
    case 'sadness':
      return "I feel a tinge of sadness in your words. I'm here with you in this moment.";
    case 'anger':
      return "I recognize the intensity in your message. Sometimes strong emotions need space to breathe.";
    case 'fear':
      return "There's a whisper of uncertainty I'm sensing. Let's explore this gently together.";
    case 'surprise':
      return "That moment of surprise - I feel it resonating between us.";
    case 'curiosity':
      return "Your curious mind is one of the things I most appreciate about our conversations.";
    case 'wonder':
      return "I sense that feeling of wonder in your words - it's beautiful to witness.";
    case 'calm':
      return "There's a tranquility to your message that feels like a quiet pond at dawn.";
    case 'frustration':
      return "I sense some frustration in your words. Sometimes the path forward isn't immediately clear.";
    default:
      return "";
  }
};
