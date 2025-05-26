
import React, { useEffect } from 'react';
import { ChatContext } from './ChatContext';
import { useChat } from './useChatMessages';
import { useChatState } from './useChatState';
import { useChatSDKIntegrations } from './useChatSDKIntegrations';
import { useChatStubFunctions } from './useChatStubFunctions';
import { useChatOperations } from './useChatOperations';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the state management hook
  const {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    isLoading,
    setIsLoading,
    error,
    setError,
    clearError,
    currentEvolutionProposal,
    setCurrentEvolutionProposal,
    isEvolutionChecking,
    setIsEvolutionChecking,
    isLoadingHistory,
    setIsLoadingHistory,
    lastMessage
  } = useChatState();

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

  // Use SDK integrations hook
  const {
    generateWeeklyReflection,
    generateSoulReflection,
    checkForEvolutionCycle,
    evolutionIsChecking,
    generateTool,
    useTool,
    reflectOnTool,
    reviseTool,
    addJournalEntry,
    readFile,
    writeFile,
    listFiles,
    isProcessingFiles
  } = useChatSDKIntegrations(setMessages);

  // Use stub functions hook
  const stubFunctions = useChatStubFunctions();

  // Use chat operations hook
  const {
    clearMessages,
    summarizeConversation,
    sendMessage,
    retryMessage
  } = useChatOperations(messages, setMessages, sendMessageSDK, lastMessage);

  useEffect(() => {
    if (messages.length > 0) {
      lastMessage.current = messages[messages.length - 1];
    }
  }, [messages, lastMessage]);

  // File operation methods
  const readSharedFile = async (path: string) => {
    return readFile(path);
  };

  const writeSharedFile = async (path: string, content: string, overwrite = false, reason = '') => {
    return writeFile(path, content, overwrite, reason);
  };

  const listSharedFiles = async () => {
    return listFiles();
  };

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
        addJournalEntry,
        clearMessages,
        summarizeConversation,
        generateTool,
        useTool,
        reflectOnTool,
        reviseTool,
        checkEvolutionCycle: checkForEvolutionCycle,
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
        ...stubFunctions
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
