
import { useState } from 'react';
import { useToast } from './use-toast';
import { useAuth } from '../contexts/AuthContext';
import { Message } from '../types';
import { 
  extractTopicFromMessages,
  generateConversationSummary,
} from '../services/ChatService';
import { MemoryService } from '../services/MemoryService';
import { supabase } from '../lib/supabase';
import { storeAssistantMessage } from '../services/api/MessageApiService';

// Function to delete all messages
const deleteAllMessages = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
};

export const useChatManagement = (
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { toast } = useToast();
  const { user } = useAuth();

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
      await deleteAllMessages(user.id);
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

  // Function to summarize the current conversation
  const summarizeConversation = async () => {
    if (!user || messages.length === 0) {
      toast({
        title: 'Error',
        description: 'No conversation to summarize',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsTyping(true);
      
      // Generate a summary of the conversation
      const topic = extractTopicFromMessages(messages);
      const summary = await generateConversationSummary(messages);
      
      // Store the summary
      await MemoryService.storeConversationSummary(user.id, summary, topic);
      
      // Add a message to indicate that the conversation was summarized
      const summaryMessage = await storeAssistantMessage(
        user.id, 
        `I've summarized our conversation about "${topic}". I'll remember the key points for future reference.`
      );
      
      setMessages((prev) => [...prev, summaryMessage]);
      
      toast({
        title: 'Success',
        description: 'Conversation summarized and stored in memory',
      });
    } catch (error: any) {
      console.error('Error summarizing conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to summarize conversation',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };

  return {
    clearMessages,
    summarizeConversation
  };
};
