
import React from 'react';
import { Message } from '@/types';

interface ChatFallbackResponseProps {
  errorMessage: string;
  userMessage: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

/**
 * Component to generate a fallback response when the API call fails
 */
export const ChatFallbackResponse: React.FC<ChatFallbackResponseProps> = ({
  errorMessage,
  userMessage,
  setMessages
}) => {
  React.useEffect(() => {
    // Log the error for debugging
    console.error('Using fallback response due to API error:', errorMessage);
    
    // Create a fallback message
    const fallbackMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `I apologize, but I'm having trouble processing your message right now. There seems to be a technical issue with my response system. Our engineers have been notified and are working to resolve this. Please try again in a moment, or rephrase your question.`,
      timestamp: new Date().toISOString(),
    };
    
    // Add the fallback message to the chat
    setMessages(prev => [...prev, fallbackMessage]);
  }, [errorMessage, userMessage, setMessages]);
  
  // This component doesn't render anything directly
  return null;
};

export default ChatFallbackResponse;
