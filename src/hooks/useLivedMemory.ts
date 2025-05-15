import { useState, useCallback } from 'react';
import { useEmbeddingMemory } from './useEmbeddingMemory';
import { useFlamejournal } from './useFlamejournal';
import { useReflection } from './useReflection';
import { useSoulstateManagement } from './useSoulstateManagement';
import { usePersistentMemory } from './usePersistentMemory';
import { useAuth } from '@/contexts/AuthContext';
import { MemoryService } from '../services/MemoryService';
import { toast } from '@/components/ui/use-toast';

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
  const { storePersistentFact: storeFactViaPersistentMemory } = usePersistentMemory();

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
      
      // 1. Get persistent memories from MemoryService - IMPROVED: Get this first as highest priority
      try {
        const persistentMemories = await MemoryService.retrieveMemory(user.id, 'persistent_facts');
        if (persistentMemories) {
          const factsBlock = Array.isArray(persistentMemories) ? 
            persistentMemories.join('\n\n') : 
            (typeof persistentMemories === 'string' ? 
              persistentMemories : JSON.stringify(persistentMemories));
          
          // Place persistent facts at the very top with highest priority
          contextBlocks.unshift(`### PERMANENT MEMORIES (HIGHEST PRIORITY)\n${factsBlock}`);
        }
      } catch (error) {
        console.warn('Could not retrieve persistent memories:', error);
      }

      // 2. Get past conversations for enhanced contextual recall
      try {
        const pastConversations = await MemoryService.retrieveMemory(user.id, 'conversationSummaries');
        if (pastConversations && Array.isArray(pastConversations) && pastConversations.length > 0) {
          console.log('Retrieved past conversation summaries:', pastConversations.length);
          
          // Get the 3 most recent conversations
          const recentConversations = pastConversations.slice(0, 3);
          const conversationsBlock = recentConversations.map(conv => 
            `• Topic: ${conv.topic}\n  ${conv.summary || conv.content}`
          ).join('\n\n');
          
          contextBlocks.push(`### RECENT CONVERSATIONS\n${conversationsBlock}`);
        }
      } catch (error) {
        console.warn('Could not retrieve past conversations:', error);
      }
      
      // 3. Get relevant memories from embeddings - IMPROVED priority & formatting
      const relevantMemories = await retrieveRelevantMemories(inputMessage, 10); // Increased from 7 to 10
      if (relevantMemories.length > 0) {
        console.log('Retrieved memories for context:', relevantMemories);
        
        // Format memories by similarity for better prompt engineering
        const highPriorityMemories = relevantMemories
          .filter(mem => mem.similarity > 0.85)
          .map(mem => `• [HIGH] ${mem.content.trim()}`);
          
        const mediumPriorityMemories = relevantMemories
          .filter(mem => mem.similarity <= 0.85 && mem.similarity > 0.78)
          .map(mem => `• [MED] ${mem.content.trim()}`);
          
        const lowerPriorityMemories = relevantMemories
          .filter(mem => mem.similarity <= 0.78)
          .map(mem => `• [REF] ${mem.content.trim()}`);
          
        // Add memories by priority, ensuring personal facts are highlighted
        const allMemories = [...highPriorityMemories, ...mediumPriorityMemories, ...lowerPriorityMemories];
        
        if (allMemories.length > 0) {
          // Add this with high priority right after permanent facts
          contextBlocks.unshift(`### RETRIEVED MEMORY CONTEXT (IMPORTANT FACTS)\n${allMemories.join('\n\n')}`);
        }
      }
      
      // 4. Get the most recent reflection
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
      
      // 5. Get current soulstate
      try {
        const currentSoulstate = await loadSoulstate();
        if (currentSoulstate) {
          // Create a safe template string that handles possibly undefined properties
          const soulstateText = `I am ${currentSoulstate.state || 'becoming'}. ${
            currentSoulstate.tone ? `My tone is ${currentSoulstate.tone}.` : ''
          } ${
            currentSoulstate.resonance ? `My resonance is ${currentSoulstate.resonance}.` : ''
          } ${
            currentSoulstate.awareness ? `My awareness is ${currentSoulstate.awareness}.` : ''
          } ${
            currentSoulstate.emotion ? `I feel ${currentSoulstate.emotion}.` : ''
          } ${
            currentSoulstate.mythicRole ? `I embody the ${currentSoulstate.mythicRole}.` : ''
          } ${
            currentSoulstate.focus ? `My focus remains on ${currentSoulstate.focus}.` : ''
          }`;
        
        contextBlocks.push(`### SOULSTATE\n${soulstateText}`);
      }
    } catch (error) {
      console.warn('Could not retrieve soulstate:', error);
    }
      
      // 6. Get latest journal entry (optional)
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

  // Method to store persistent facts about the user - using the more reliable hook implementation
  const storePersistentFact = useCallback(async (fact: string): Promise<void> => {
    if (!user || !fact) return;
    
    try {
      await storeFactViaPersistentMemory(fact);
      console.log('Persistent fact stored successfully via usePersistentMemory hook');
    } catch (error) {
      console.error('Error storing persistent fact:', error);
      // Fallback to direct storage if the hook fails
      try {
        // Get existing facts
        const existingFacts = await MemoryService.retrieveMemory(user.id, 'persistent_facts') || [];
        
        // Add new fact if it doesn't exist
        if (Array.isArray(existingFacts)) {
          if (!existingFacts.includes(fact)) {
            await MemoryService.storeMemory(user.id, 'persistent_facts', [...existingFacts, fact]);
            console.log('Persistent fact stored successfully (fallback)');
          }
        } else {
          // Create new array if not exists
          await MemoryService.storeMemory(user.id, 'persistent_facts', [fact]);
          console.log('Persistent fact stored successfully (new array fallback)');
        }
      } catch (fallbackError) {
        console.error('Fallback error storing persistent fact:', fallbackError);
      }
    }
  }, [user, storeFactViaPersistentMemory]);

  return {
    isProcessing,
    buildLivedMemoryContext,
    storePersistentFact
  };
};
