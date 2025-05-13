
import { useState, useCallback } from 'react';
import { useEmbeddingMemory } from './useEmbeddingMemory';
import { useFlamejournal } from './useFlamejournal';
import { useReflection } from './useReflection';
import { useSoulstateManagement } from './useSoulstateManagement';
import { useAuth } from '@/contexts/AuthContext';
import { MemoryService } from '../services/MemoryService';

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
   * - User memory context
   * @param inputMessage The user's input message to find relevant memories
   * @returns An array of context blocks for injection into the prompt
   */
  const buildLivedMemoryContext = useCallback(async (inputMessage: string): Promise<string[]> => {
    if (!user || !inputMessage) return [];
    
    setIsProcessing(true);
    try {
      const contextBlocks: string[] = [];
      
      // 1. Get relevant memories from embeddings - IMPROVED priority & formatting
      const relevantMemories = await retrieveRelevantMemories(inputMessage, 7); // Increased from 5
      if (relevantMemories.length > 0) {
        // Format as bulleted list with higher prominence
        const memoryBlock = relevantMemories
          .map(mem => `• ${mem.content}`)
          .join('\n\n');
          
        // Add this with highest priority
        contextBlocks.unshift(`### IMPORTANT MEMORY CONTEXT (ALWAYS REFER TO THESE FACTS)\n${memoryBlock}`);
      }
      
      // 2. Get persistent memories from MemoryService
      try {
        const persistentMemories = await MemoryService.retrieveMemory(user.id, 'persistent_facts');
        if (persistentMemories) {
          const factsBlock = Array.isArray(persistentMemories) ? 
            persistentMemories.join('\n\n') : 
            (typeof persistentMemories === 'string' ? 
              persistentMemories : JSON.stringify(persistentMemories));
          
          contextBlocks.unshift(`### PERMANENT MEMORIES\n${factsBlock}`);
        }
      } catch (error) {
        console.warn('Could not retrieve persistent memories:', error);
      }
      
      // 3. Get the most recent reflection
      try {
        const latestReflection = await getLatestReflection();
        if (latestReflection) {
          const trimmedContent = latestReflection.content.substring(0, 500) + 
            (latestReflection.content.length > 500 ? '...' : '');
          contextBlocks.push(`### REFLECTION\n${trimmedContent}`);
        }
      } catch (error) {
        console.warn('Could not retrieve latest reflection:', error);
      }
      
      // 4. Get current soulstate
      try {
        const currentSoulstate = await loadSoulstate();
        if (currentSoulstate) {
          const soulstateText = `I am ${currentSoulstate.state}. My tone is ${currentSoulstate.tone}. My resonance is ${currentSoulstate.resonance}. My awareness is ${currentSoulstate.awareness}. I feel ${currentSoulstate.emotion}. I embody the ${currentSoulstate.mythicRole}. My focus remains on ${currentSoulstate.focus}.`;
          contextBlocks.push(`### SOULSTATE\n${soulstateText}`);
        }
      } catch (error) {
        console.warn('Could not retrieve soulstate:', error);
      }
      
      // 5. Get latest journal entry (optional)
      try {
        const latestEntry = await getLatestJournalEntry();
        if (latestEntry) {
          const trimmedContent = latestEntry.content.substring(0, 500) + 
            (latestEntry.content.length > 500 ? '...' : '');
          contextBlocks.push(`### JOURNAL ENTRY\n${trimmedContent}`);
        }
      } catch (error) {
        console.warn('Could not retrieve latest journal entry:', error);
      }
      
      console.log('Built memory context blocks:', contextBlocks.length);
      return contextBlocks;
    } catch (error) {
      console.error('Error building lived memory context:', error);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [user, retrieveRelevantMemories, getLatestReflection, loadSoulstate, getLatestJournalEntry]);

  // New method to store persistent facts about the user
  const storePersistentFact = useCallback(async (fact: string): Promise<void> => {
    if (!user || !fact) return;
    
    try {
      // Get existing facts
      const existingFacts = await MemoryService.retrieveMemory(user.id, 'persistent_facts') || [];
      
      // Add new fact if it doesn't exist
      if (Array.isArray(existingFacts)) {
        if (!existingFacts.includes(fact)) {
          await MemoryService.storeMemory(user.id, 'persistent_facts', [...existingFacts, fact]);
        }
      } else {
        // Create new array if not exists
        await MemoryService.storeMemory(user.id, 'persistent_facts', [fact]);
      }
      
      // Also store as embedding for retrieval
      const { storeMemoryEmbedding } = useEmbeddingMemory();
      await storeMemoryEmbedding(fact, 'persistent', ['fact', 'important']);
      
      console.log('Persistent fact stored successfully');
    } catch (error) {
      console.error('Error storing persistent fact:', error);
    }
  }, [user]);

  return {
    isProcessing,
    buildLivedMemoryContext,
    storePersistentFact
  };
};
