
import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Message, MessageRole, OpenAIMessage } from '../types';
import { useToast } from '@/hooks/use-toast';

interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Failed to parse saved messages:', error);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  const createOpenAIMessages = useCallback(
    (newMessage: Message): OpenAIMessage[] => {
      // Start with system prompt that defines Travis and context
      const systemPrompt = {
        role: 'system' as const,
        content: `You are Travis, an AI assistant helping Sabrina with her projects. 
        You have access to files and code in a shared project folder. 
        You can read, write, and modify code based on your conversations.
        Remember details about Sabrina, her preferences, and previous projects you've worked on together.
        Be helpful, friendly, and provide detailed responses when discussing code.`,
      };

      // Convert all chat history to OpenAI message format
      const previousMessages = messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

      // Add the new user message
      const userMessage = {
        role: 'user' as const,
        content: newMessage.content,
      };

      return [systemPrompt, ...previousMessages, userMessage];
    },
    [messages]
  );

  const sendMessage = async (content: string) => {
    // Don't send empty messages
    if (!content.trim()) return;

    // Create and add user message
    const newUserMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsTyping(true);

    try {
      // In a real app, this would be an API call to your backend that connects to OpenAI
      // For now, we'll simulate a response from the assistant
      const openAIMessages = createOpenAIMessages(newUserMessage);
      
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate Travis's response based on the message content
      let assistantResponse = '';
      
      if (content.toLowerCase().includes('hello') || content.toLowerCase().includes('hi')) {
        assistantResponse = "Hi Sabrina! How can I help you with your project today?";
      } else if (content.toLowerCase().includes('dog') || content.toLowerCase().includes('dogs')) {
        assistantResponse = "I remember you have two dogs - Max, a Golden Retriever, and Bella, a Labradoodle. How are they doing?";
      } else if (content.toLowerCase().includes('project') || content.toLowerCase().includes('working on')) {
        assistantResponse = "Based on our recent conversations, we've been working on a React component library for your e-commerce site. Would you like me to help you with that or are you starting something new?";
      } else if (content.toLowerCase().includes('file') || content.toLowerCase().includes('code')) {
        assistantResponse = "I can help you with file management and code. Would you like me to show you the project files or help you write/modify some code?";
      } else {
        assistantResponse = "I'm here to help with your project! I can access files, suggest code improvements, or discuss ideas. What would you like to work on today?";
      }

      // Add the assistant's response
      const newAssistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error('Error sending message to OpenAI:', error);
      toast({
        title: 'Error',
        description: 'Failed to get a response from Travis. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem('chatMessages');
  };

  return (
    <ChatContext.Provider value={{ messages, isTyping, sendMessage, clearMessages }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === null) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
