
import React, { useEffect } from 'react';
import { ChatContext } from './ChatContext';
import { useChat } from './useChatMessages';
import { useChatState } from './useChatState';
import { useChatSDKIntegrations } from './useChatSDKIntegrations';
import { useChatStubFunctions } from './useChatStubFunctions';
import { useChatOperations } from './useChatOperations';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the main chat hook that handles messages and history
  const {
    messages,
    setMessages,
    isTyping,
    sendMessage,
    isProcessingCommand,
    memoryContext,
    refreshMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    isLoadingHistory
  } = useChat();

  // Use the state management hook for additional state
  const {
    isLoading,
    setIsLoading,
    error,
    setError,
    clearError,
    currentEvolutionProposal,
    setCurrentEvolutionProposal,
    isEvolutionChecking,
    setIsEvolutionChecking,
    lastMessage
  } = useChatState();

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

  // Use chat operations hook - but don't pass sendMessage to avoid conflicts
  const {
    clearMessages,
    summarizeConversation,
    retryMessage
  } = useChatOperations(messages, setMessages, sendMessage, lastMessage);

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
        sendMessage, // Use the sendMessage directly from useChat
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
