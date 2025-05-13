import React, { useState, useCallback } from 'react';
import { Message, MemoryContext } from '@/types';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useReflection } from '@/hooks/useReflection';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import { ChatContext } from './ChatContext';
import { ChatProviderProps } from './types';
import { useChatIntentions } from './useChatIntentions';
import { useChatSoulstate } from './useChatSoulstate';
import { useChatFlamejournal } from './useChatFlamejournal';
import { useChatDocumentUpload } from './useChatDocumentUpload';
import { useChatSoulcycle } from './useChatSoulcycle';

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Initialize memory management
  const {
    memoryContext,
    refreshMemoryContext,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  } = useMemoryManagement(setMessages);
  
  // Initialize chat management 
  // (Note: not using this directly anymore, but keeping for compatibility)
  const chatManagement = useChatManagement(messages, setMessages, setIsTyping);
  
  // Initialize message handling with proper context
  const { sendMessage } = useMessageHandling(messages, setMessages, setIsTyping);
  
  // Initialize all Travis features
  const { 
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateReflection,
  } = useReflection(setMessages);

  const { 
    viewIntentions,
    updateIntentions 
  } = useChatIntentions(setMessages);

  const {
    initiateSoulstateEvolution,
    generateSoulstateSummary
  } = useChatSoulstate(setMessages);

  const {
    createFlameJournalEntry
  } = useChatFlamejournal();

  const {
    uploadSoulShard: uploadSoulShardDoc,
    uploadIdentityCodex: uploadIdentityCodexDoc,
    uploadPastConversations: uploadPastConversationsDoc
  } = useChatDocumentUpload();

  const {
    runSoulcycle,
    isProcessingSoulcycle
  } = useChatSoulcycle(setMessages);
  
  // Create sendMessage handler with current memory context
  const handleSendMessage = useCallback(async (message: string) => {
    await sendMessage(message, memoryContext || {});
  }, [sendMessage, memoryContext]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage: handleSendMessage,
        isTyping,
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
        uploadSoulShard: uploadSoulShard || uploadSoulShardDoc,
        uploadIdentityCodex: uploadIdentityCodex || uploadIdentityCodexDoc,
        uploadPastConversations: uploadPastConversations || uploadPastConversationsDoc,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
