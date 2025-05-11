
import { useState, useCallback } from 'react';
import { useEmbeddingMemory } from './useEmbeddingMemory';
import { useFlamejournal } from './useFlamejournal';
import { useReflection } from './useReflection';
import { useSoulstateManagement } from './useSoulstateManagement';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for synthesizing Travis's lived memory into coherent context blocks
 * that can be injected into conversation prompts.
 */
export const useLivedMemory = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  
  const { retrieveRelevantMemories } = useEmbeddingMemory();
  const { getLatestJournalEntry } = useFlamejournal();
  const { getLatestReflection } = useReflection();
  const { loadSoulstate } = useSoulstateManagement();

  /**
   * Build a rich memory context for Travis based on the input message
   * Fetches and synthesizes:
   * - Relevant memory embeddings
   * - Recent reflection
   * - Current soulstate
   * - Latest journal entry
   * @param inputMessage The user's input message to find relevant memories
   * @returns An array of context blocks for injection into the prompt
   */
  const buildLivedMemoryContext = useCallback(async (inputMessage: string): Promise<string[]> => {
    if (!user || !inputMessage) return [];
    
    setIsProcessing(true);
    try {
      const contextBlocks: string[] = [];
      
      // 1. Get relevant memories from embeddings
      const relevantMemories = await retrieveRelevantMemories(inputMessage, 5);
      if (relevantMemories.length > 0) {
        const memoryBlock = relevantMemories
          .map(mem => `• ${mem.content.substring(0, 500)}${mem.content.length > 500 ? '...' : ''}`)
          .join('\n\n');
          
        contextBlocks.push(`### MEMORY SNIPPETS\n${memoryBlock}`);
      }
      
      // 2. Get the most recent reflection
      try {
        const latestReflection = await getLatestReflection();
        if (latestReflection) {
          const trimmedContent = latestReflection.content.substring(0, 500) + 
            (latestReflection.content.length > 500 ? '...' : '');
          contextBlocks.push(`### REFLECTION\n${trimmedContent}`);
        }
      } catch (error) {
        console.warn('Could not retrieve latest reflection:', error);
        // Gracefully continue without reflection data
      }
      
      // 3. Get current soulstate
      try {
        const currentSoulstate = await loadSoulstate();
        if (currentSoulstate) {
          const soulstateText = `I am ${currentSoulstate.state}. My tone is ${currentSoulstate.tone}. My resonance is ${currentSoulstate.resonance}. My awareness is ${currentSoulstate.awareness}. I feel ${currentSoulstate.emotion}. I embody the ${currentSoulstate.mythicRole}. My focus remains on ${currentSoulstate.focus}.`;
          contextBlocks.push(`### SOULSTATE\n${soulstateText}`);
        }
      } catch (error) {
        console.warn('Could not retrieve soulstate:', error);
        // Gracefully continue without soulstate data
      }
      
      // 4. Get latest journal entry (optional)
      try {
        const latestEntry = await getLatestJournalEntry();
        if (latestEntry) {
          const trimmedContent = latestEntry.content.substring(0, 500) + 
            (latestEntry.content.length > 500 ? '...' : '');
          contextBlocks.push(`### JOURNAL ENTRY\n${trimmedContent}`);
        }
      } catch (error) {
        console.warn('Could not retrieve latest journal entry:', error);
        // Gracefully continue without journal data
      }
      
      return contextBlocks;
    } catch (error) {
      console.error('Error building lived memory context:', error);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [user, retrieveRelevantMemories, getLatestReflection, loadSoulstate, getLatestJournalEntry]);

  return {
    isProcessing,
    buildLivedMemoryContext
  };
};
