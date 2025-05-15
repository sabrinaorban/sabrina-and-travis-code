
import React, { useEffect } from 'react';
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
  useEffect(() => {
    // Log the error for debugging
    console.error('Using fallback response due to API error:', errorMessage);
    
    // Create a fallback message
    const fallbackMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `I apologize, but I'm having trouble connecting to my response system right now. There seems to be a technical issue (${errorMessage}). Our engineers have been notified and are working to resolve this. In the meantime, you can try:
      
1. Refreshing the page
2. Using simpler commands like "reflect" or "soulstate"
3. Trying again in a few moments

I'm still here and learning from our conversation, even if I can't respond perfectly right now.`,
      timestamp: new Date().toISOString(),
    };
    
    // Add the fallback message to the chat
    setMessages(prev => [...prev, fallbackMessage]);
  }, [errorMessage, userMessage, setMessages]);
  
  // This component doesn't render anything directly
  return null;
};

export default ChatFallbackResponse;
