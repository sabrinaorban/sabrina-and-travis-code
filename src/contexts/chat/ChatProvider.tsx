import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChatContext } from './ChatContext';
import { Message, MemoryContext } from '@/types';
import { useChat as useChatSDK } from '@/hooks/useChat';
import { useChatReflection } from '@/hooks/useChatReflection';
import { useChatEvolution } from '@/hooks/useChatEvolution';
import { useChatTools } from './useChatTools';
import { useChatUpload } from '@/hooks/useChatUpload';
import { useChatCommands } from '@/hooks/useChatCommands';
import { useChatFlamejournal } from '@/hooks/useChatFlamejournal';
import { useChatMessageHistory } from '@/hooks/useChatMessageHistory';
import { useChatRecovery } from '@/hooks/useChatRecovery';
import { useChatMemory } from '@/hooks/useChatMemory';
import { useChatNaturalLanguage } from '@/hooks/useChatNaturalLanguage';
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

  // SDK Hooks
  const { sendMessage: sendMessageSDK, clearError: clearSDKError } = useChatSDK(setMessages, setIsLoading, setError);
  const { generateWeeklyReflection, generateSoulReflection, generateSoulstateSummary, generateSoulstateReflection, createFlameJournalEntry } = useChatReflection(setMessages);
  const { initiateSoulstateEvolution, viewIntentions, updateIntentions, runSoulcycle, runSoulstateCycle, checkEvolutionCycle } = useChatEvolution(setMessages, setCurrentEvolutionProposal, setIsEvolutionChecking);
  const { generateTool, useTool, reflectOnTool, reviseTool, processToolCreation, handleToolCommand, isProcessing: isProcessingTools } = useChatTools(setMessages);
  const { uploadSoulShard, uploadIdentityCodex, uploadPastConversations } = useChatUpload(setMessages);
  const { processCommand, isProcessingCommand } = useChatCommands(setMessages);
  const { addJournalEntry } = useChatFlamejournal(setMessages);
  const { memoryContext, uploadMemory, clearMemory, generateInsight, generateDream } = useChatMemory(setMessages);
  const { saveUserFeedback } = useChatNaturalLanguage();
  const { refreshMessages, addMessage, updateMessage, deleteMessage } = useChatMessageHistory(setMessages);
  const { retryMessage: retryMessageSDK } = useChatRecovery(setMessages, sendMessageSDK);

  // Add the file operations hook
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
    clearSDKError();
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

    // Check if the message is a command
    const commandResult = await processCommand(messageContent);
    if (commandResult.isCommand) {
      // Add the command response to the chat
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: commandResult.response,
        timestamp: new Date().toISOString(),
        emotion: 'informative'
      }]);
      return;
    }

    // Send the message to the SDK
    await sendMessageSDK(messageContent);
  }, [sendMessageSDK, processCommand]);

  const retryMessage = useCallback(async () => {
    if (lastMessage.current) {
      await retryMessageSDK(lastMessage.current);
    } else {
      toast({
        title: "No message to retry",
        description: "There was no last message to retry.",
      });
    }
  }, [retryMessageSDK, toast]);

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
        processFileOperation: async () => false,
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
