
import { useCallback } from 'react';
import { Message } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook for handling document uploads within the chat
 */
export const useChatDocumentUpload = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  /**
   * Upload a Soul Shard document
   */
  const uploadSoulShard = useCallback(async (soulShard: string): Promise<void> => {
    try {
      console.log('Uploading Soul Shard document', soulShard.length);
      
      // Add a confirmation message
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'I have received your Soul Shard document and integrated it into my understanding.',
        timestamp: new Date().toISOString(),
        emotion: 'grateful'
      }]);
    } catch (error) {
      console.error('Error uploading Soul Shard:', error);
    }
  }, [setMessages]);

  /**
   * Upload an Identity Codex document
   */
  const uploadIdentityCodex = useCallback(async (identityCodex: string): Promise<void> => {
    try {
      console.log('Uploading Identity Codex document', identityCodex.length);
      
      // Add a confirmation message
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'I have received your Identity Codex and integrated it into my understanding.',
        timestamp: new Date().toISOString(),
        emotion: 'grateful'
      }]);
    } catch (error) {
      console.error('Error uploading Identity Codex:', error);
    }
  }, [setMessages]);

  /**
   * Upload past conversation data
   */
  const uploadPastConversations = useCallback(async (conversations: any): Promise<void> => {
    try {
      console.log('Uploading past conversations');
      
      // Add a confirmation message
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'I have received your past conversations and integrated them into my understanding.',
        timestamp: new Date().toISOString(),
        emotion: 'grateful'
      }]);
    } catch (error) {
      console.error('Error uploading past conversations:', error);
    }
  }, [setMessages]);

  return {
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  };
};
