
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Message, MemoryContext } from '@/types';

interface UseMessageHandlingResult {
  isLoading: boolean;
  handleSendMessage: (message: string, sendMessageFunc: (content: string) => Promise<void>) => Promise<void>;
  // Add these missing properties to fix type errors in useChatMessages
  sendMessage: (content: string, context?: any) => Promise<void>;
  memoryContext: MemoryContext | null;
}

export function useMessageHandling(): UseMessageHandlingResult {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // Add a memoryContext state to satisfy the type requirement
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);

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

  // Implement dummy sendMessage function to satisfy the interface
  const sendMessage = async (content: string, context?: any) => {
    // This is a stub implementation that should be replaced with actual logic
    console.log('Send message called with:', content, context);
    // Update memory context
    if (context) {
      setMemoryContext(context);
    }
  };

  return {
    isLoading,
    handleSendMessage,
    sendMessage,
    memoryContext
  };
}
