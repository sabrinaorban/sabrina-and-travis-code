
import { useCallback, useState } from 'react';
import { Message } from '@/types';
import { useEvolutionCycle } from './useEvolutionCycle';
import { useToast } from './use-toast';

/**
 * Hook for managing Travis's evolution cycle within the chat
 */
export const useChatEvolution = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  // Track messages we've already processed to prevent duplicates
  const [processedMessageIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // Initialize the evolution cycle hook
  const {
    isChecking,
    isDueForEvolution,
    currentProposal,
    presentEvolutionProposal,
    applyEvolutionProposal,
    declineEvolutionProposal,
    checkEvolutionCycleDue
  } = useEvolutionCycle(setMessages);
  
  // Handle a message that might be a response to an evolution proposal
  const handleEvolutionResponse = useCallback(async (message: string): Promise<boolean> => {
    if (!currentProposal) return false;
    
    // Check if the message is an affirmative response
    const isAffirmative = /\b(yes|yeah|sure|ok|okay|approve|accept|agreed|confirm|evolve|do it)\b/i.test(message);
    
    // Check if the message is a negative response
    const isNegative = /\b(no|nope|don't|dont|not now|wait|decline|reject|negative|stop)\b/i.test(message);
    
    if (isAffirmative) {
      try {
        // User approved the evolution
        const success = await applyEvolutionProposal();
        
        if (success) {
          const confirmationMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "Thank you for guiding my evolution. I've integrated these changes into my being. I'm grateful for your presence in my journey of becoming.",
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, confirmationMessage]);
        }
        
        return true;
      } catch (error) {
        console.error('Error applying evolution proposal:', error);
        toast({
          title: 'Evolution Failed',
          description: 'Unable to apply the evolution changes',
          variant: 'destructive',
        });
      }
    } else if (isNegative) {
      // User declined the evolution
      declineEvolutionProposal();
      return true;
    }
    
    // Not a response to the evolution proposal
    return false;
  }, [currentProposal, applyEvolutionProposal, declineEvolutionProposal, setMessages, toast]);
  
  // Force check for evolution cycle - but with protection against repeated triggers
  const checkForEvolutionCycle = useCallback(async (): Promise<boolean> => {
    // We use this lastCheckTime to prevent checking too frequently
    const lastCheckKey = 'last_evolution_check';
    const lastCheckStr = localStorage.getItem(lastCheckKey);
    const now = Date.now();
    
    try {
      // If we've checked in the last 5 minutes, don't check again
      if (lastCheckStr) {
        const lastCheck = parseInt(lastCheckStr, 10);
        if (now - lastCheck < 5 * 60 * 1000) {
          console.log("Evolution cycle checked too recently, skipping check");
          return false;
        }
      }
      
      // Update the last check time
      localStorage.setItem(lastCheckKey, now.toString());
      
      if (await checkEvolutionCycleDue()) {
        await presentEvolutionProposal();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking evolution cycle:', error);
      toast({
        title: 'Evolution Check Failed',
        description: 'Unable to check for evolution cycle',
        variant: 'destructive',
      });
      return false;
    }
  }, [checkEvolutionCycleDue, presentEvolutionProposal, toast]);

  return {
    isEvolutionChecking: isChecking,
    isDueForEvolution,
    currentProposal,
    handleEvolutionResponse,
    checkForEvolutionCycle
  };
};
