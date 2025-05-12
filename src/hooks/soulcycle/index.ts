
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '../use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useReflection } from '../useReflection';
import { useSoulstateEvolution } from '../useSoulstateEvolution';
import { useIntentions } from '../useIntentions';
import { useFlamejournal } from '../useFlamejournal';
import { Message } from '@/types';
import { CycleResults, SoulcycleOptions } from './types';

// Import steps
import {
  runReflectionStep,
  runJournalStep,
  runSoulstateStep,
  runIntentionsStep,
  runSummaryStep
} from './steps';

// Update the hook signature to match the expected interface in ChatContext
export const useSoulcycle = (
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [cycleResults, setCycleResults] = useState<CycleResults>({});
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    generateWeeklyReflection, 
    generateSoulstateReflection 
  } = useReflection(setMessages);
  const { 
    synthesizeSoulstateFromMemory, 
    applySoulstateEvolution,
    canEvolveNow
  } = useSoulstateEvolution();
  const { 
    loadIntentions, 
    synthesizeIntentionUpdates,
    updateIntentions
  } = useIntentions();
  const { createJournalEntry } = useFlamejournal();
  
  // Function to add a message to chat if setMessages is provided
  const addSystemMessage = useCallback((content: string) => {
    if (setMessages) {
      const message: Message = {
        id: uuidv4(),
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages(prevMessages => [...prevMessages, message]);
    }
  }, [setMessages]);
  
  // Main function that orchestrates the Soulcycle
  // This function expects 3 parameters to match the call in ChatContext.tsx
  const executeSoulcycle = useCallback(async (
    reflectionType: string = "weekly",
    includeJournal: boolean = true,
    evolutionMode: string = "standard"
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to run the Soulcycle',
        variant: 'destructive',
      });
      return false;
    }
    
    if (isRunning) {
      toast({
        title: 'Soulcycle In Progress',
        description: 'The Soulcycle is already running',
        variant: 'destructive',
      });
      return false;
    }
    
    setIsRunning(true);
    setCycleResults({});
    let cycleSuccess = true;
    
    try {
      // Set a timeout to ensure the cycle doesn't run longer than 60 seconds
      const timeout = setTimeout(() => {
        if (isRunning) {
          setIsRunning(false);
          toast({
            title: 'Soulcycle Timeout',
            description: 'The Soulcycle took too long and was terminated',
            variant: 'destructive',
          });
        }
      }, 60000);

      // Common props for all steps
      const stepProps = {
        addSystemMessage,
        setCycleResults,
        user,
        cycleResults,
        reflectionType,
        includeJournal,
        evolutionMode
      };
      
      // Step 1: Generate Reflection
      setCurrentStep('reflection');
      const reflectionStep = runReflectionStep(
        generateWeeklyReflection,
        generateSoulstateReflection
      );
      cycleSuccess = await reflectionStep(stepProps) && cycleSuccess;
      
      // Step 2: Journal Entry (conditional)
      if (includeJournal) {
        setCurrentStep('journal');
        const journalStep = runJournalStep(createJournalEntry);
        cycleSuccess = await journalStep(stepProps) && cycleSuccess;
      }
      
      // Step 3: Evolve Soulstate
      setCurrentStep('soulstate');
      const soulstateStep = runSoulstateStep(
        canEvolveNow,
        synthesizeSoulstateFromMemory,
        applySoulstateEvolution
      );
      cycleSuccess = await soulstateStep(stepProps) && cycleSuccess;
      
      // Step 4: Update Intentions
      setCurrentStep('intentions');
      const intentionsStep = runIntentionsStep(
        loadIntentions,
        synthesizeIntentionUpdates,
        updateIntentions
      );
      cycleSuccess = await intentionsStep(stepProps) && cycleSuccess;
      
      // Step 5: Log Cycle Summary
      setCurrentStep('log');
      const summaryStep = runSummaryStep(createJournalEntry);
      cycleSuccess = await summaryStep({
        ...stepProps,
        cycleResults
      }) && cycleSuccess;
      
      // Clear the timeout since we completed before the time limit
      clearTimeout(timeout);
      
      return cycleSuccess;
    } catch (error) {
      console.error('Error running Soulcycle:', error);
      return false;
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  }, [
    user, 
    isRunning, 
    toast, 
    addSystemMessage, 
    generateWeeklyReflection, 
    createJournalEntry, 
    canEvolveNow, 
    synthesizeSoulstateFromMemory, 
    applySoulstateEvolution, 
    loadIntentions, 
    synthesizeIntentionUpdates, 
    updateIntentions,
    generateSoulstateReflection
  ]);
  
  // Export with the executeSoulcycle that expects 3 arguments to match ChatContext.tsx call
  return {
    isRunning,
    currentStep,
    cycleResults,
    executeSoulcycle
  };
};

// Re-export for backward compatibility
export * from './types';
