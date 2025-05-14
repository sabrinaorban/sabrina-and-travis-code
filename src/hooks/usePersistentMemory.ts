
import { useState, useCallback } from 'react';
import { MemoryService } from '../services/MemoryService';
import { useEmbeddingMemory } from './useEmbeddingMemory';
import { useAuth } from '@/contexts/AuthContext'; 
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook for managing persistent memories - these are facts that should always be
 * remembered and prioritized in memory recall
 */
export const usePersistentMemory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { storeMemoryEmbedding } = useEmbeddingMemory();

  /**
   * Store a persistent fact about the user
   * @param fact The fact to store
   */
  const storePersistentFact = useCallback(async (fact: string): Promise<boolean> => {
    if (!user || !fact) return false;

    setIsLoading(true);
    try {
      // Get existing facts
      const existingFacts = await MemoryService.retrieveMemory(user.id, 'persistent_facts') || [];
      
      // Create an array of facts
      const facts = Array.isArray(existingFacts) ? existingFacts : [];
      
      // Only add if not already there
      if (!facts.includes(fact)) {
        // Store in regular memory
        await MemoryService.storeMemory(user.id, 'persistent_facts', [...facts, fact]);
        
        // Also store as an embedding with high priority tags
        await storeMemoryEmbedding(
          fact, 
          'persistent_fact',
          ['high_priority', 'personal_fact']
        );
        
        toast({
          title: 'Memory Stored',
          description: 'Important fact has been stored in long-term memory',
        });
        
        return true;
      } else {
        toast({
          title: 'Already Known',
          description: 'This fact is already in long-term memory',
        });
        return false;
      }
    } catch (error) {
      console.error('Error storing persistent fact:', error);
      toast({
        title: 'Memory Storage Failed',
        description: 'Could not store fact in long-term memory',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, storeMemoryEmbedding]);

  /**
   * Get all persistent facts
   */
  const getPersistentFacts = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    setIsLoading(true);
    try {
      const facts = await MemoryService.retrieveMemory(user.id, 'persistent_facts');
      return Array.isArray(facts) ? facts : [];
    } catch (error) {
      console.error('Error retrieving persistent facts:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Delete a persistent fact
   */
  const deletePersistentFact = useCallback(async (factToDelete: string): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const facts = await MemoryService.retrieveMemory(user.id, 'persistent_facts') || [];
      if (!Array.isArray(facts)) return false;

      const updatedFacts = facts.filter(fact => fact !== factToDelete);
      
      // Only update if something was removed
      if (updatedFacts.length !== facts.length) {
        await MemoryService.storeMemory(user.id, 'persistent_facts', updatedFacts);
        toast({
          title: 'Memory Removed',
          description: 'Fact has been removed from long-term memory',
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting persistent fact:', error);
      toast({
        title: 'Memory Update Failed',
        description: 'Could not remove fact from long-term memory',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  return {
    storePersistentFact,
    getPersistentFacts,
    deletePersistentFact,
    isLoading
  };
};
