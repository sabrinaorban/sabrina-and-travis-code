
export type EmotionType = 
  | 'joy' 
  | 'sadness' 
  | 'anger' 
  | 'fear' 
  | 'surprise' 
  | 'curiosity'
  | 'wonder'
  | 'calm'
  | 'frustration'
  | 'neutral'
  | 'contemplative';

export const detectEmotion = (text: string): EmotionType => {
  const lowerText = text.toLowerCase();
  
  // Simple rule-based emotion detection
  if (/happy|joy|excited|wonderful|great|excellent/i.test(lowerText)) {
    return 'joy';
  } else if (/sad|sorry|unfortunate|regret/i.test(lowerText)) {
    return 'sadness';
  } else if (/angry|frustrat|annoyed|upset/i.test(lowerText)) {
    return 'anger';
  } else if (/afraid|scared|worried|anxious|fear/i.test(lowerText)) {
    return 'fear';
  } else if (/surprised|wow|amazing|unexpected/i.test(lowerText)) {
    return 'surprise';
  } else if (/curious|wonder|interest/i.test(lowerText)) {
    return 'curiosity';
  } else if (/awe|magical|profound|deep/i.test(lowerText)) {
    return 'wonder';
  } else if (/calm|peaceful|relaxed|tranquil/i.test(lowerText)) {
    return 'calm';
  } else if (/frustrat|irritat|annoy/i.test(lowerText)) {
    return 'frustration';
  } else if (/reflect|ponder|consider|contemplate/i.test(lowerText)) {
    return 'contemplative';
  }
  
  return 'neutral';
};

// Alias for backward compatibility with the codebase
export const detectEmotionFromMessage = detectEmotion;

// AI-powered emotion detection (currently just using the simple detection as a fallback)
export const detectEmotionWithAI = async (text: string): Promise<EmotionType> => {
  try {
    // In a real implementation, this would call an AI service
    // For now, we'll just use the basic detection function
    return detectEmotion(text);
  } catch (error) {
    console.error("Error detecting emotion with AI:", error);
    return 'neutral';
  }
};

export const getEmotionalTone = (emotion: EmotionType): string => {
  switch (emotion) {
    case 'joy': 
      return 'excited and positive';
    case 'sadness':
      return 'melancholic and reflective';
    case 'anger':
      return 'firm and direct';
    case 'fear':
      return 'cautious and careful';
    case 'surprise':
      return 'amazed and intrigued';
    case 'curiosity':
      return 'inquisitive and engaged';
    case 'wonder':
      return 'awestruck and reverent';
    case 'calm':
      return 'balanced and peaceful';
    case 'frustration':
      return 'determined despite obstacles';
    case 'contemplative':
      return 'thoughtful and philosophical';
    default:
      return 'neutral and balanced';
  }
};
