
import React, { createContext, useState, useContext, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Message, MessageRole, OpenAIMessage } from '../types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load messages from Supabase when user is authenticated
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: true });
          
        if (error) {
          throw error;
        }
        
        if (data) {
          const formattedMessages: Message[] = data.map(msg => ({
            id: msg.id,
            role: msg.role as MessageRole,
            content: msg.content,
            timestamp: new Date(msg.timestamp).getTime(),
          }));
          
          setMessages(formattedMessages);
        }
      } catch (error: any) {
        console.error('Error fetching messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat history',
          variant: 'destructive',
        });
      }
    };
    
    fetchMessages();
  }, [user, toast]);

  const createOpenAIMessages = (messageHistory: Message[], newMessage: Message): OpenAIMessage[] => {
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
    const previousMessages = messageHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }));

    // Add the new user message
    const userMessage = {
      role: 'user' as const,
      content: newMessage.content,
    };

    return [systemPrompt, ...previousMessages, userMessage];
  };

  const sendMessage = async (content: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive',
      });
      return;
    }
    
    // Don't send empty messages
    if (!content.trim()) return;

    try {
      // Create and add user message to Supabase
      const newUserMessage: Message = {
        id: nanoid(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      
      // Add message to local state immediately for UI responsiveness
      setMessages((prev) => [...prev, newUserMessage]);
      
      // Insert message into Supabase
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          id: newUserMessage.id,
          user_id: user.id,
          role: newUserMessage.role,
          content: newUserMessage.content,
          timestamp: new Date(newUserMessage.timestamp).toISOString(),
        });
        
      if (insertError) {
        throw insertError;
      }

      // Set typing indicator while waiting for response
      setIsTyping(true);

      try {
        // Create the OpenAI messages from chat history
        const openAIMessages = createOpenAIMessages(messages, newUserMessage);
        
        // Call OpenAI API through Supabase Edge Function
        const { data: response, error: apiError } = await supabase.functions.invoke('openai-chat', {
          body: { messages: openAIMessages }
        });

        if (apiError) {
          throw apiError;
        }

        // Process the assistant's response
        const assistantResponse = response.choices[0].message.content;
        
        const newAssistantMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content: assistantResponse,
          timestamp: Date.now(),
        };

        // Add to local state
        setMessages((prev) => [...prev, newAssistantMessage]);
        
        // Insert into Supabase
        const { error: assistantInsertError } = await supabase
          .from('messages')
          .insert({
            id: newAssistantMessage.id,
            user_id: user.id,
            role: newAssistantMessage.role,
            content: newAssistantMessage.content,
            timestamp: new Date(newAssistantMessage.timestamp).toISOString(),
          });
          
        if (assistantInsertError) {
          throw assistantInsertError;
        }
      } catch (error) {
        // If the OpenAI call fails, fall back to simulated responses
        console.error('Error calling OpenAI:', error);
        
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

        // Add the fallback assistant's response
        const newFallbackMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content: assistantResponse,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, newFallbackMessage]);
        
        // Insert fallback message into Supabase
        await supabase
          .from('messages')
          .insert({
            id: newFallbackMessage.id,
            user_id: user.id,
            role: newFallbackMessage.role,
            content: newFallbackMessage.content,
            timestamp: new Date(newFallbackMessage.timestamp).toISOString(),
          });
          
        toast({
          title: 'Warning',
          description: 'Using fallback response as OpenAI API call failed',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error in chat flow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const clearMessages = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to clear messages',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', user.id);
        
      if (error) {
        throw error;
      }
      
      setMessages([]);
      
      toast({
        title: 'Success',
        description: 'Chat history cleared',
      });
    } catch (error: any) {
      console.error('Error clearing messages:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear messages',
        variant: 'destructive',
      });
    }
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
