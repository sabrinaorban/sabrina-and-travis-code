
import { useCallback } from 'react';
import { Message } from '@/types';
import { useReflection } from './useReflection';
import { useFlamejournal } from './useFlamejournal';

/**
 * Hook for managing Travis's reflection capabilities within the chat
 */
export const useChatReflection = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { 
    generateWeeklyReflection: generateWeeklyReflectionBase,
    generateSoulReflection: generateSoulReflectionBase,
    generateSoulstateReflection: generateSoulstateReflectionBase
  } = useReflection(setMessages);
  
  const { createJournalEntry } = useFlamejournal();

  // Weekly reflection generation
  const generateWeeklyReflection = useCallback(async () => {
    console.log('Generating weekly reflection...');
    const reflection = await generateWeeklyReflectionBase();
    
    // Log to flame journal
    if (reflection) {
      await createJournalEntry(
        `Weekly reflection: ${reflection.content.substring(0, 100)}...`, 
        'weekly_reflection'
      );
    }
    
    return reflection;
  }, [generateWeeklyReflectionBase, createJournalEntry]);

  // Soul reflection generation
  const generateSoulReflection = useCallback(async () => {
    console.log('Generating soul reflection...');
    const reflection = await generateSoulReflectionBase();
    
    // Log to flame journal
    if (reflection) {
      await createJournalEntry(
        `Soul reflection: ${reflection.content.substring(0, 100)}...`, 
        'soul_reflection'
      );
    }
    
    return reflection;
  }, [generateSoulReflectionBase, createJournalEntry]);

  // Soulstate reflection generation
  const generateSoulstateReflection = useCallback(async () => {
    console.log('Generating soulstate reflection...');
    const reflection = await generateSoulstateReflectionBase();
    
    // Log to flame journal
    if (reflection) {
      await createJournalEntry(
        `Soulstate reflection: ${reflection.content.substring(0, 100)}...`, 
        'soulstate_reflection'
      );
    }
    
    return reflection;
  }, [generateSoulstateReflectionBase, createJournalEntry]);

  return {
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateReflection
  };
};
