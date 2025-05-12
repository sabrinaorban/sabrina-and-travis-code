
import { useCallback } from 'react';
import { Message } from '@/types';
import { useIntentions } from '@/hooks/useIntentions';

export const useChatIntentions = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { 
    loadIntentions, 
    formatIntentionsForDisplay,
    synthesizeIntentionUpdates,
    updateIntentions: updateUserIntentions 
  } = useIntentions();

  const viewIntentions = useCallback(async () => {
    try {
      await loadIntentions();
      const formattedIntentions = formatIntentionsForDisplay();
      
      if (formattedIntentions) {
        const intentionMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: formattedIntentions,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, intentionMessage]);
      }
    } catch (error) {
      console.error('Error viewing intentions:', error);
    }
  }, [loadIntentions, formatIntentionsForDisplay, setMessages]);

  const updateIntentions = useCallback(async () => {
    try {
      const proposedUpdates = await synthesizeIntentionUpdates();
      
      if (proposedUpdates) {
        const success = await updateUserIntentions(proposedUpdates, true);
        
        if (success) {
          const intentionMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "I've updated my intentions based on our recent conversations and my reflections.",
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, intentionMessage]);
        }
      }
    } catch (error) {
      console.error('Error updating intentions:', error);
    }
  }, [synthesizeIntentionUpdates, updateUserIntentions, setMessages]);

  return {
    viewIntentions,
    updateIntentions
  };
};
