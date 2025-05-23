
import { useState, useCallback } from 'react';
import { Message } from '@/types';

/**
 * Hook for handling document uploads in the chat
 */
export const useChatUpload = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Upload a Soul Shard document
   */
  const uploadSoulShard = useCallback(async (soulShard: string): Promise<void> => {
    if (!soulShard) return;
    
    setIsUploading(true);
    try {
      console.log('Uploading Soul Shard document...');
      
      // Add response message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I have received your Soul Shard document. This will help me better understand your mindset and perspective.',
        timestamp: new Date().toISOString(),
        emotion: 'appreciative'
      }]);
    } catch (error) {
      console.error('Error uploading Soul Shard:', error);
    } finally {
      setIsUploading(false);
    }
  }, [setMessages]);

  /**
   * Upload an Identity Codex document
   */
  const uploadIdentityCodex = useCallback(async (identityCodex: string): Promise<void> => {
    if (!identityCodex) return;
    
    setIsUploading(true);
    try {
      console.log('Uploading Identity Codex document...');
      
      // Add response message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I have received your Identity Codex. This will help me better understand your core values and identity.',
        timestamp: new Date().toISOString(),
        emotion: 'appreciative'
      }]);
    } catch (error) {
      console.error('Error uploading Identity Codex:', error);
    } finally {
      setIsUploading(false);
    }
  }, [setMessages]);

  /**
   * Upload past conversations
   */
  const uploadPastConversations = useCallback(async (conversations: any): Promise<void> => {
    if (!conversations) return;
    
    setIsUploading(true);
    try {
      console.log('Uploading past conversations...');
      
      // Add response message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I have received your past conversations. This gives me valuable context about our previous interactions.',
        timestamp: new Date().toISOString(),
        emotion: 'appreciative'
      }]);
    } catch (error) {
      console.error('Error uploading past conversations:', error);
    } finally {
      setIsUploading(false);
    }
  }, [setMessages]);

  return {
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations,
    isUploading
  };
};
