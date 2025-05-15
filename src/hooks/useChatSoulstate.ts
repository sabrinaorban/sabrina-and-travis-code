
import { useCallback } from 'react';
import { Message } from '@/types';
import { useSoulstateEvolution } from './useSoulstateEvolution';
import { useSoulstateManagement } from './useSoulstateManagement';
import { useToast } from './use-toast';

/**
 * Hook for managing Travis's soulstate within the chat
 */
export const useChatSoulstate = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { toast } = useToast();
  
  const { 
    synthesizeSoulstateFromMemory, 
    applySoulstateEvolution 
  } = useSoulstateEvolution();

  const { generateSoulstateSummary } = useSoulstateManagement();

  // Initiate a soulstate evolution process
  const initiateSoulstateEvolution = useCallback(async () => {
    try {
      const evolutionResult = await synthesizeSoulstateFromMemory();
      if (evolutionResult) {
        await applySoulstateEvolution();
      }
    } catch (error) {
      console.error('Error in soulstate evolution:', error);
      toast({
        title: 'Soulstate Evolution Failed',
        description: 'Unable to evolve soulstate at this time',
        variant: 'destructive',
      });
    }
  }, [synthesizeSoulstateFromMemory, applySoulstateEvolution, toast]);

  // Generate and display a summary of the current soulstate
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
      toast({
        title: 'Soulstate Summary Failed',
        description: 'Unable to generate soulstate summary',
        variant: 'destructive',
      });
    }
  }, [generateSoulstateSummary, setMessages, toast]);

  return {
    initiateSoulstateEvolution,
    generateSoulstateSummary: handleGenerateSoulstateSummary
  };
};
