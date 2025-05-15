
import { useCallback } from 'react';
import { Message } from '@/types';
import { useReflection } from './useReflection';

/**
 * Hook for managing Travis's reflection capabilities within the chat
 */
export const useChatReflection = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { 
    generateWeeklyReflection: generateWeeklyReflectionBase,
    generateSoulReflection: generateSoulReflectionBase,
    generateSoulstateReflection: generateSoulstateReflectionBase
  } = useReflection(setMessages);

  // Weekly reflection generation
  const generateWeeklyReflection = useCallback(async () => {
    console.log('Generating weekly reflection...');
    return await generateWeeklyReflectionBase();
  }, [generateWeeklyReflectionBase]);

  // Soul reflection generation
  const generateSoulReflection = useCallback(async () => {
    console.log('Generating soul reflection...');
    return await generateSoulReflectionBase();
  }, [generateSoulReflectionBase]);

  // Soulstate reflection generation
  const generateSoulstateReflection = useCallback(async () => {
    console.log('Generating soulstate reflection...');
    return await generateSoulstateReflectionBase();
  }, [generateSoulstateReflectionBase]);

  return {
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateReflection
  };
};
