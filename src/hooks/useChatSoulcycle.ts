
import { useCallback, useState } from 'react';
import { useSoulcycle } from './soulcycle';
import { useToast } from './use-toast';
import { Message } from '@/types';

/**
 * Hook for managing soulcycle operations within the chat
 */
export const useChatSoulcycle = (setMessages: React.Dispatch<React.SetStateAction<Message[]>> | undefined) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { executeSoulcycle } = useSoulcycle(setMessages);

  const runSoulcycle = useCallback(async (): Promise<boolean> => {
    if (!setMessages) {
      toast({
        title: 'Soulcycle Error',
        description: 'Unable to run soulcycle without message context',
        variant: 'destructive',
      });
      return false;
    }
    
    setIsProcessing(true);
    try {
      return await executeSoulcycle('weekly', true, 'standard');
    } catch (error) {
      console.error('Error executing soulcycle:', error);
      toast({
        title: 'Soulcycle Failed',
        description: 'Unable to complete the soulcycle process',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [executeSoulcycle, setMessages, toast]);

  return {
    runSoulcycle,
    isProcessingSoulcycle: isProcessing
  };
};
