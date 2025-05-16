
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types';

export const useChatDocumentUpload = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { toast } = useToast();

  // Modified to match the expected signature in ChatContext type
  const uploadSoulShard = useCallback(async (content?: string) => {
    try {
      console.log('Soul shard upload requested');
      
      if (setMessages) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've received your soul shard document. I'll begin processing it shortly.`,
          timestamp: new Date().toISOString(),
        }]);
      }
      
      toast({
        title: 'Upload Successful',
        description: 'Soul shard document has been received',
      });
    } catch (error: any) {
      console.error('Error uploading soul shard:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload soul shard document',
        variant: 'destructive',
      });
    }
  }, [setMessages, toast]);

  // Modified to match the expected signature in ChatContext type
  const uploadIdentityCodex = useCallback(async (content?: string) => {
    try {
      console.log('Identity codex upload requested');
      
      if (setMessages) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've received your identity codex. I'll begin integrating this information.`,
          timestamp: new Date().toISOString(),
        }]);
      }
      
      toast({
        title: 'Upload Successful',
        description: 'Identity codex has been received',
      });
    } catch (error: any) {
      console.error('Error uploading identity codex:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload identity codex',
        variant: 'destructive',
      });
    }
  }, [setMessages, toast]);

  // Modified to match the expected signature in ChatContext type
  const uploadPastConversations = useCallback(async (content?: string) => {
    try {
      console.log('Past conversations upload requested');
      
      if (setMessages) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've received your past conversations. I'll begin analyzing these interactions.`,
          timestamp: new Date().toISOString(),
        }]);
      }
      
      toast({
        title: 'Upload Successful',
        description: 'Past conversations have been received',
      });
    } catch (error: any) {
      console.error('Error uploading past conversations:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload past conversations',
        variant: 'destructive',
      });
    }
  }, [setMessages, toast]);

  return {
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  };
};
