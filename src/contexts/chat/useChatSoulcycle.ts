
import { useCallback } from 'react';
import { useSoulcycle } from '@/hooks/soulcycle';
import { Message } from '@/types';

export const useChatSoulcycle = (setMessages: React.Dispatch<React.SetStateAction<Message[]>> | undefined) => {
  const { executeSoulcycle, isProcessing } = useSoulcycle(setMessages);

  // Run standard weekly soulcycle
  const runSoulcycle = useCallback(async (): Promise<void> => {
    // Pass 'weekly' as the reflection type, and make sure it's a type included in SoulcycleOptions
    await executeSoulcycle('weekly', true, 'standard');
  }, [executeSoulcycle]);

  // Add a function to run soulcycle with soulstate reflection
  const runSoulstateCycle = useCallback(async (): Promise<void> => {
    // Pass 'soulstate' as the reflection type
    await executeSoulcycle('soulstate', true, 'deep');
  }, [executeSoulcycle]);

  return {
    runSoulcycle,
    runSoulstateCycle,
    isProcessingSoulcycle: isProcessing
  };
};
