
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChatContext } from './ChatContext';
import { Message, MemoryContext } from '@/types';
import { useChat } from './useChatMessages';
import { useChatReflection } from '@/hooks/useChatReflection';
import { useChatEvolution } from '@/hooks/useChatEvolution';
import { useChatTools } from './useChatTools';
import { useChatUpload } from './useChatDocumentUpload';
import { useChatCommands } from './useChatCommands';
import { useChatFlamejournal } from '@/hooks/useChatFlamejournal';
import { useTravisFileOperations } from '@/hooks/useTravisFileOperations';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEvolutionProposal, setCurrentEvolutionProposal] = useState<any>();
  const [isEvolutionChecking, setIsEvolutionChecking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const lastMessage = useRef<Message | null>(null);
  const { toast } = useToast();

  // Use the useChat hook from local useChatMessages
  const {
    sendMessage: sendMessageSDK,
    isTyping: chatIsTyping,
    isProcessingCommand,
    memoryContext,
    refreshMessages,
    addMessage,
    updateMessage,
    deleteMessage
  } = useChat();

  // SDK Hooks - Fixed: pass setMessages as argument to useChatFlamejournal
  const { generateWeeklyReflection, generateSoulReflection } = useChatReflection(setMessages);
  const { checkForEvolutionCycle, isEvolutionChecking: evolutionIsChecking } = useChatEvolution();  
  const { generateTool, useTool, reflectOnTool, reviseTool } = useChatTools(setMessages);
  const { addJournalEntry } = useChatFlamejournal(setMessages);

  // Add the file operations hook - Fixed: pass setMessages as argument
  const {
    readFile,
    writeFile,
    listFiles,
    isProcessing: isProcessingFiles
  } = useTravisFileOperations(setMessages);

  useEffect(() => {
    if (messages.length > 0) {
      lastMessage.current = messages[messages.length - 1];
    }
  }, [messages]);

  const clearError = () => {
    setError(null);
  };

  const clearMessages = useCallback(async () => {
    setMessages([]);
  }, []);

  const summarizeConversation = useCallback(async () => {
    setIsLoading(true);
    try {
      // Prepare the conversation history for summarization
      const conversationHistory = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

      // Call the Supabase function to summarize the conversation
      const { data, error } = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation: conversationHistory }),
      }).then(res => res.json());

      if (error) {
        console.error('Error summarizing conversation:', error);
        setError('Failed to summarize conversation.');
        return;
      }

      // Add the summary to the chat
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: `Here's a summary of our conversation:\n${data.summary}`,
        timestamp: new Date().toISOString(),
        emotion: 'informative'
      }]);
    } catch (err) {
      console.error('Error summarizing conversation:', err);
      setError('Failed to summarize conversation.');
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const sendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim()) return;

    const newMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      emotion: 'neutral'
    };

    setMessages(prev => [...prev, newMessage]);
    await sendMessageSDK(messageContent);
  }, [sendMessageSDK]);

  const retryMessage = useCallback(async () => {
    if (lastMessage.current) {
      // Just re-send the message content
      await sendMessageSDK(lastMessage.current.content);
    } else {
      toast({
        title: "No message to retry",
        description: "There was no last message to retry.",
      });
    }
  }, [sendMessageSDK, toast]);

  // File operation methods
  const readSharedFile = useCallback(async (path: string) => {
    return readFile(path);
  }, [readFile]);

  const writeSharedFile = useCallback(async (path: string, content: string, overwrite = false, reason = '') => {
    return writeFile(path, content, overwrite, reason);
  }, [writeFile]);

  const listSharedFiles = useCallback(async () => {
    return listFiles();
  }, [listFiles]);

  // Stub functions for required context properties
  const generateSoulstateSummary = useCallback(async () => {}, []);
  const generateSoulstateReflection = useCallback(async () => {}, []);
  const createFlameJournalEntry = useCallback(async () => {}, []);
  const initiateSoulstateEvolution = useCallback(async () => {}, []);
  const viewIntentions = useCallback(async () => {}, []);
  const updateIntentions = useCallback(async () => {}, []);
  const runSoulcycle = useCallback(async () => {}, []);
  const runSoulstateCycle = useCallback(async () => {}, []);
  const checkEvolutionCycle = useCallback(async () => {}, []);
  const uploadSoulShard = useCallback(async () => {}, []);
  const uploadIdentityCodex = useCallback(async () => {}, []);
  const uploadPastConversations = useCallback(async () => {}, []);
  const generateInsight = useCallback(async () => {}, []);
  const generateDream = useCallback(async () => {}, []);
  const processFileOperation = useCallback(async () => false, []);
  const saveUserFeedback = useCallback(async () => false, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isTyping,
        isLoading,
        memoryContext,
        generateWeeklyReflection,
        generateSoulReflection,
        generateSoulstateSummary,
        generateSoulstateReflection,
        createFlameJournalEntry,
        initiateSoulstateEvolution,
        viewIntentions,
        updateIntentions,
        runSoulcycle,
        runSoulstateCycle,
        uploadSoulShard,
        uploadIdentityCodex,
        uploadPastConversations,
        generateInsight,
        generateDream,
        addJournalEntry,
        processFileOperation,
        saveUserFeedback,
        clearMessages,
        summarizeConversation,
        generateTool,
        useTool,
        reflectOnTool,
        reviseTool,
        checkEvolutionCycle,
        currentEvolutionProposal,
        isEvolutionChecking,
        isLoadingHistory,
        refreshMessages,
        addMessage,
        updateMessage,
        deleteMessage,
        isProcessingCommand,
        error,
        clearError,
        retryMessage,
        readSharedFile,
        writeSharedFile,
        listSharedFiles,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
