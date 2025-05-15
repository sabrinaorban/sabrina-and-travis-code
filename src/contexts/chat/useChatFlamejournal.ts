
import { useCallback } from 'react';
import { useFlamejournal, FlameJournalEntry } from '@/hooks/useFlamejournal';

export const useChatFlamejournal = () => {
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

  return {
    createFlameJournalEntry
  };
};
