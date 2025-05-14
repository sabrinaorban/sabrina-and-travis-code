
import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types';
import { EmotionType } from '@/services/utils/EmotionUtils';

interface MessageBubbleProps {
  message: Message;
  className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, className }) => {
  // Get emotion-specific styling
  const getEmotionStyle = (emotion: string | null | undefined): string => {
    switch(emotion) {
      case 'joy':
        return 'border-l-amber-400';
      case 'sadness':
        return 'border-l-blue-400';
      case 'anger':
        return 'border-l-red-400';
      case 'fear':
        return 'border-l-purple-400';
      case 'surprise':
        return 'border-l-emerald-400';
      case 'curiosity':
        return 'border-l-cyan-400';
      case 'wonder':
        return 'border-l-indigo-400';
      case 'calm':
        return 'border-l-teal-400';
      case 'frustration':
        return 'border-l-orange-400';
      default:
        return 'border-l-transparent';
    }
  };
  
  // Get subtle background color based on emotion
  const getEmotionBackground = (emotion: string | null | undefined): string => {
    if (!emotion || emotion === 'neutral') return '';
    
    const isAssistant = message.role === 'assistant';
    
    // For user messages
    if (!isAssistant) {
      switch(emotion) {
        case 'joy':
          return 'bg-amber-50';
        case 'sadness':
          return 'bg-blue-50';
        case 'anger':
          return 'bg-red-50';
        case 'fear':
          return 'bg-purple-50';
        case 'surprise':
          return 'bg-emerald-50';
        case 'curiosity':
          return 'bg-cyan-50';
        case 'wonder':
          return 'bg-indigo-50';
        case 'calm':
          return 'bg-teal-50';
        case 'frustration':
          return 'bg-orange-50';
        default:
          return '';
      }
    }
    
    // For assistant messages, use more subtle styling
    return '';
  };

  const emotionStyle = getEmotionStyle(message.emotion);
  const emotionBg = getEmotionBackground(message.emotion);
  
  const isUser = message.role === 'user';
  
  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg',
        'border-l-4',
        emotionStyle,
        emotionBg,
        isUser ? 'bg-white' : 'bg-travis-light text-gray-800',
        className
      )}
    >
      {message.content}
    </div>
  );
};
