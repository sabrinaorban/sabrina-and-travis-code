
import { useCallback } from 'react';
import { useSoulcycle } from '@/hooks/soulcycle';

export const useChatSoulcycle = (setMessages?: React.Dispatch<React.SetStateAction<any>>) => {
  const {
    executeSoulcycle
  } = useSoulcycle(setMessages);
  
  const runSoulcycle = useCallback(async (): Promise<boolean> => {
    console.log("Running soul cycle...");
    return await executeSoulcycle("weekly", true, "standard");
  }, [executeSoulcycle]);

  return {
    runSoulcycle
  };
};
