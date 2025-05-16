// Update the line with the wrong toast variant
// Change from:
// variant: 'warning',
// To:
// variant: 'default',

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types';

interface UseMessageHandlingResult {
  isLoading: boolean;
  handleSendMessage: (message: string, sendMessageFunc: (content: string) => Promise<void>) => Promise<void>;
}

export function useMessageHandling(): UseMessageHandlingResult {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string, sendMessageFunc: (content: string) => Promise<void>) => {
    if (!message.trim() || isLoading) {
      if (!message.trim()) {
        toast({
          title: 'Empty message',
          description: 'Please enter a message before sending.',
          variant: 'default',
        });
      }
      return;
    }

    setIsLoading(true);
    try {
      await sendMessageFunc(message);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleSendMessage,
  };
}
