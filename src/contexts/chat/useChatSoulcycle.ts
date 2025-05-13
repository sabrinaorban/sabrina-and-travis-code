
import { useCallback } from 'react';
import { useSoulcycle } from '@/hooks/soulcycle';
import { Message } from '@/types';

export const useChatSoulcycle = (setMessages: React.Dispatch<React.SetStateAction<Message[]>> | undefined) => {
  const { executeSoulcycle, isProcessing } = useSoulcycle(setMessages);

  const runSoulcycle = useCallback(async (): Promise<boolean> => {
    return await executeSoulcycle('weekly', true, 'standard');
  }, [executeSoulcycle]);

  return {
    runSoulcycle,
    isProcessingSoulcycle: isProcessing
  };
};
