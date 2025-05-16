
import { useCallback } from 'react';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import { Message } from '@/types';

/**
 * Hook for memory operations within chat context
 */
export const useChatMemory = () => {
  const { storeMemory, recallMemories } = useMemoryManagement();

  /**
   * Store a user message and assistant response in memory
   */
  const storeMemory = useCallback(async (userMessage: string, assistantResponse: string) => {
    try {
      await storeMemory(userMessage, assistantResponse);
    } catch (error) {
      console.error('Error storing memory:', error);
    }
  }, [storeMemory]);

  /**
   * Recall memories relevant to a query
   */
  const recallRelevantMemories = useCallback(async (query: string, limit: number = 5) => {
    try {
      return await recallMemories(query, limit);
    } catch (error) {
      console.error('Error recalling memories:', error);
      return [];
    }
  }, [recallMemories]);

  return {
    storeMemory,
    recallRelevantMemories
  };
};
