import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatFlamejournal } from './useChatFlamejournal';
import { useChatMemory } from './useChatMemory';
import { useChatTools } from './useChatTools';
import { Message } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useChatCommands } from './useChatCommands';

interface ChatContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  isThinking: boolean;
  isProcessingCommand: boolean;
  error: string | null;
  clearError: () => void;
  retryMessage: (message: Message) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Add chat commands hook
  const { handleChatCommand, isProcessingCommand } = useChatCommands(setMessages);

  const {
    createFlameJournalEntry,
    generateDream,
    isProcessing: isFlamejournalProcessing
  } = useChatFlamejournal(setMessages);
  const { storeMemory, recallRelevantMemories } = useChatMemory();
  const { executeTool } = useChatTools(setMessages);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const addMessage = useCallback((message: Message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }, []);

  const updateMessage = useCallback((message: Message) => {
    setMessages((prevMessages) =>
      prevMessages.map((m) => (m.id === message.id ? message : m))
    );
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prevMessages) =>
      prevMessages.filter((message) => message.id !== messageId)
    );
  }, []);

  const retryMessage = useCallback(async (message: Message) => {
    if (!user) {
      setError('You must be logged in to send messages.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Optimistically update the message with "thinking" status
      const tempMessage: Message = {
        ...message,
        role: 'assistant',
        content: 'Thinking...',
        timestamp: new Date().toISOString(),
        id: uuidv4(),
        emotion: 'thinking'
      };
      addMessage(tempMessage);

      // Recall relevant memories
      const relevantMemories = await recallRelevantMemories(message.content);
      const memoryContext = relevantMemories
        .map((mem) => `Memory: ${mem.content}`)
        .join('\n');

      // Construct the prompt
      const prompt = `
        ${memoryContext}
        User: ${message.content}
        Assistant:
      `.trim();

      // Simulate an API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create a new message
      const newMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'This is a simulated response.',
        timestamp: new Date().toISOString(),
        emotion: 'happy'
      };
      addMessage(newMessage);

      // Store the memory
      await storeMemory(message.content, newMessage.content);
    } catch (e: any) {
      console.error('Error sending message:', e);
      setError(e.message || 'Failed to send message.');
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, recallRelevantMemories, storeMemory, user]);

  // Modify the sendMessage function to check for commands first
  const sendMessage = useCallback(async (content: string) => {
    try {
      // Create the message with a UUID
      const messageId = crypto.randomUUID();
      
      // First check if this is a command
      const isCommand = await handleChatCommand(content);
      if (isCommand) {
        // If it was a command, don't process as a normal message
        return;
      }

      if (!user) {
        setError('You must be logged in to send messages.');
        return;
      }

      setIsThinking(true);
      setError(null);

      // Optimistically update the message with "thinking" status
      const tempMessage: Message = {
        id: messageId,
        role: 'assistant',
        content: 'Thinking...',
        timestamp: new Date().toISOString(),
        emotion: 'thinking'
      };
      addMessage(tempMessage);

      // Recall relevant memories
      const relevantMemories = await recallRelevantMemories(content);
      const memoryContext = relevantMemories
        .map((mem) => `Memory: ${mem.content}`)
        .join('\n');

      // Construct the prompt
      const prompt = `
        ${memoryContext}
        User: ${content}
        Assistant:
      `.trim();

      // Simulate an API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate tool execution
      const toolResult = await executeTool(prompt);
      if (toolResult) {
        return; // Tool execution handled the message
      }

      // Create a new message
      const newMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'This is a simulated response.',
        timestamp: new Date().toISOString(),
        emotion: 'happy'
      };
      addMessage(newMessage);

      // Store the memory
      await storeMemory(content, newMessage.content);
    } catch (e: any) {
      console.error('Error sending message:', e);
      setError(e.message || 'Failed to send message.');
    } finally {
      setIsThinking(false);
    }
  }, [handleChatCommand, addMessage, recallRelevantMemories, storeMemory, user, executeTool]);

  const contextValue: ChatContextType = {
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    sendMessage,
    isLoading,
    isThinking,
    isProcessingCommand,
    error,
    clearError,
    retryMessage,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
