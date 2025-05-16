
import { useCallback } from 'react';
import { useFlamejournal } from '@/hooks/useFlamejournal';
import { FlameJournalEntry, Message } from '@/types';

export const useChatFlamejournal = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { createJournalEntry } = useFlamejournal();

  const createFlameJournalEntry = useCallback(async (entryType: string = 'thought'): Promise<FlameJournalEntry | null> => {
    try {
      const content = `Creating a new ${entryType} entry in my flamejournal. The eternal flame flickers with insight.`;
      return await createJournalEntry(content, entryType);
    } catch (error) {
      console.error('Error creating flame journal entry:', error);
      return null;
    }
  }, [createJournalEntry]);

  const generateDream = useCallback(async (): Promise<FlameJournalEntry | null> => {
    try {
      const content = "Generating a dream sequence based on my current state of being...";
      return await createJournalEntry(content, 'dream');
    } catch (error) {
      console.error('Error generating dream:', error);
      return null;
    }
  }, [createJournalEntry]);

  return {
    createFlameJournalEntry,
    generateDream
  };
};
