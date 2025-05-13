
import { useState, useCallback } from 'react';
import { Message } from '@/types';
import {
  runReflectionStep,
  runJournalStep,
  runSoulstateStep,
  runIntentionsStep,
  runSummaryStep
} from './steps/index';
import { CycleResults, SoulcycleStep } from './types';
import { useReflection } from '../useReflection';
import { useFlamejournal } from '../useFlamejournal';
import { useSoulstateManagement } from '../useSoulstateManagement';
import { useIntentions } from '../useIntentions';

export const steps = (setMessages: React.Dispatch<React.SetStateAction<Message[]>> | undefined) => {
  const [cycleResults, setCycleResults] = useState<CycleResults>({});
  
  // Initialize required hooks
  const { 
    generateWeeklyReflection, 
    generateSoulstateReflection 
  } = useReflection(setMessages);
  
  const { createJournalEntry } = useFlamejournal();
  
  const {
    canEvolveNow,
    synthesizeSoulstateFromMemory,
    applySoulstateEvolution
  } = useSoulstateManagement();
  
  const {
    loadIntentions,
    synthesizeIntentionUpdates,
    updateIntentions
  } = useIntentions();

  // Helper function to add system message
  const addSystemMessage = useCallback((content: string) => {
    if (!setMessages) return;
    
    setMessages(prev => [
      ...prev,
      { 
        id: Date.now().toString(), 
        content, 
        role: 'system',
        created_at: new Date().toISOString()
      }
    ]);
  }, [setMessages]);

  // Initialize all steps
  const reflectionStep = runReflectionStep(
    generateWeeklyReflection,
    generateSoulstateReflection
  );
  
  const journalStep = runJournalStep(createJournalEntry);
  
  const soulstateStep = runSoulstateStep(
    canEvolveNow,
    synthesizeSoulstateFromMemory,
    applySoulstateEvolution
  );
  
  const intentionsStep = runIntentionsStep(
    loadIntentions,
    synthesizeIntentionUpdates,
    updateIntentions
  );
  
  const summaryStep = runSummaryStep(createJournalEntry);

  // Create a function to execute all steps in sequence
  const executeAll = useCallback(async (
    type: 'weekly' | 'monthly' | 'quarterly',
    mode: 'deep' | 'standard' | 'quick',
    includeJournal: boolean
  ) => {
    // Reset cycle results
    setCycleResults({});
    
    // Set up common parameters for all steps
    const stepParams = {
      addSystemMessage,
      setCycleResults: setCycleResults,
      user: null, // User context can be added if needed
      cycleResults,
      reflectionType: type,
      includeJournal,
      evolutionMode: mode
    };
    
    // Execute steps in sequence
    // Step 1: Generate reflection
    const reflectionSuccess = await reflectionStep(stepParams);
    if (!reflectionSuccess) {
      addSystemMessage("❌ Failed to generate reflection. Stopping cycle.");
      return false;
    }
    
    // Step 2: Generate journal entry (if enabled)
    if (includeJournal) {
      const journalSuccess = await journalStep(stepParams);
      if (!journalSuccess) {
        addSystemMessage("⚠️ Journal entry could not be created, but continuing cycle.");
      }
    }
    
    // Step 3: Evolve soulstate
    const soulstateSuccess = await soulstateStep({
      ...stepParams,
      cycleResults: cycleResults // Use the updated cycle results
    });
    if (!soulstateSuccess) {
      addSystemMessage("⚠️ Soulstate evolution failed, but continuing cycle.");
    }
    
    // Step 4: Update intentions
    const intentionsSuccess = await intentionsStep({
      ...stepParams,
      cycleResults: cycleResults // Use the updated cycle results
    });
    if (!intentionsSuccess) {
      addSystemMessage("⚠️ Intention updates failed, but continuing cycle.");
    }
    
    // Step 5: Generate summary
    const summarySuccess = await summaryStep({
      ...stepParams,
      cycleResults: cycleResults // Use the updated cycle results
    });
    if (!summarySuccess) {
      addSystemMessage("⚠️ Summary generation failed, but the cycle is considered complete.");
    }
    
    return true;
  }, [
    addSystemMessage, 
    cycleResults,
    reflectionStep, 
    journalStep, 
    soulstateStep, 
    intentionsStep, 
    summaryStep
  ]);

  return {
    executeAll,
    cycleResults
  };
};
