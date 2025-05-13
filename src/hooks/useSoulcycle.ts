
import { useCallback, useState } from 'react';
import { Message } from '@/types';
import { steps } from './soulcycle/steps';

export const useSoulcycle = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>> | undefined
) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const executeSoulcycle = useCallback(
    async (
      type: 'weekly' | 'monthly' | 'quarterly',
      includeJournal: boolean = true,
      mode: 'deep' | 'standard' | 'quick' = 'standard'
    ): Promise<boolean> => {
      if (!setMessages) return false;
      
      try {
        setIsProcessing(true);
        
        // Execute all soulcycle steps from the imported steps
        const stepsExecutor = steps(setMessages);
        await stepsExecutor.executeAll(type, mode, includeJournal);
        
        return true;
      } catch (error) {
        console.error('Error executing soulcycle:', error);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [setMessages]
  );

  return {
    executeSoulcycle,
    isProcessing
  };
};
