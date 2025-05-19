
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

  const runSoulcycle = useCallback(async (): Promise<void> => {
    if (!setMessages) {
      toast({
        title: 'Soulcycle Error',
        description: 'Unable to run soulcycle without message context',
        variant: 'destructive',
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await executeSoulcycle('weekly', true, 'standard');
    } catch (error) {
      console.error('Error executing soulcycle:', error);
      toast({
        title: 'Soulcycle Failed',
        description: 'Unable to complete the soulcycle process',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [executeSoulcycle, setMessages, toast]);

  // Add a new function to run soulcycle with soulstate reflection
  const runSoulstateCycle = useCallback(async (): Promise<void> => {
    if (!setMessages) {
      toast({
        title: 'Soulstate Cycle Error',
        description: 'Unable to run soulstate cycle without message context',
        variant: 'destructive',
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await executeSoulcycle('soulstate', true, 'deep');
    } catch (error) {
      console.error('Error executing soulstate cycle:', error);
      toast({
        title: 'Soulstate Cycle Failed',
        description: 'Unable to complete the soulstate cycle process',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [executeSoulcycle, setMessages, toast]);

  return {
    runSoulcycle,
    runSoulstateCycle,
    isProcessingSoulcycle: isProcessing
  };
};
