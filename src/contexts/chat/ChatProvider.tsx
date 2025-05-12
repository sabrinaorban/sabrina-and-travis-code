
import React, { useState, useCallback } from 'react';
import { Message, MemoryContext } from '@/types';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useReflection } from '@/hooks/useReflection';
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
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);
  
  const chatManagement = useChatManagement(messages, setMessages, setIsTyping);
  const { sendMessage: handleSendMessage } = useMessageHandling();
  
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
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  } = useChatDocumentUpload();

  const {
    runSoulcycle
  } = useChatSoulcycle(setMessages);
  
  const sendMessage = useCallback(async (message: string) => {
    await handleSendMessage(message, memoryContext || {});
  }, [handleSendMessage, memoryContext]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
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
        uploadSoulShard,
        uploadIdentityCodex,
        uploadPastConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
