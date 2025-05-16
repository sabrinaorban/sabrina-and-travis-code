
import { useCallback } from 'react';
import { useFlamejournal } from '@/hooks/useFlamejournal';
import { FlameJournalEntry, Message } from '@/types';

export const useChatFlamejournal = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { createJournalEntry } = useFlamejournal();

  // Modified to return void to match expected types in ChatProvider
  const createFlameJournalEntry = useCallback(async (entryType: string = 'thought'): Promise<void> => {
    try {
      const content = `Creating a new ${entryType} entry in my flamejournal. The eternal flame flickers with insight.`;
      await createJournalEntry(content, entryType);
    } catch (error) {
      console.error('Error creating flame journal entry:', error);
    }
  }, [createJournalEntry]);

  // Modified to return void to match expected types in ChatProvider
  const generateDream = useCallback(async (): Promise<void> => {
    try {
      const content = "Generating a dream sequence based on my current state of being...";
      await createJournalEntry(content, 'dream');
    } catch (error) {
      console.error('Error generating dream:', error);
    }
  }, [createJournalEntry]);

  return {
    createFlameJournalEntry,
    generateDream
  };
};
