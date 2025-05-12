
import { useCallback } from 'react';
import { Message } from '@/types';
import { useSoulstateEvolution } from '@/hooks/useSoulstateEvolution';
import { useSoulstateManagement } from '@/hooks/useSoulstateManagement';

export const useChatSoulstate = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { 
    synthesizeSoulstateFromMemory, 
    applySoulstateEvolution 
  } = useSoulstateEvolution();

  const { generateSoulstateSummary } = useSoulstateManagement();

  const initiateSoulstateEvolution = useCallback(async () => {
    try {
      const evolutionResult = await synthesizeSoulstateFromMemory();
      if (evolutionResult) {
        await applySoulstateEvolution();
      }
    } catch (error) {
      console.error('Error in soulstate evolution:', error);
    }
  }, [synthesizeSoulstateFromMemory, applySoulstateEvolution]);

  const handleGenerateSoulstateSummary = useCallback(async () => {
    try {
      const summary = await generateSoulstateSummary();
      if (setMessages && summary) {
        const message: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: summary,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      console.error('Error generating soulstate summary:', error);
    }
  }, [generateSoulstateSummary, setMessages]);

  return {
    initiateSoulstateEvolution,
    generateSoulstateSummary: handleGenerateSoulstateSummary
  };
};
