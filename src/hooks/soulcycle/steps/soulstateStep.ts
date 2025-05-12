
import { SoulcycleStep } from '../types';

export const runSoulstateStep = (
  canEvolveNow: () => Promise<boolean>,
  synthesizeSoulstateFromMemory: () => Promise<any>,
  applySoulstateEvolution: () => Promise<any>
): SoulcycleStep => {
  return async ({ addSystemMessage, setCycleResults }) => {
    try {
      addSystemMessage("Step 3/5: Evolving soulstate based on reflections and memory...");
      
      // Check if evolution is allowed now
      const canEvolve = await canEvolveNow();
      
      if (canEvolve) {
        // Synthesize potential soulstate evolution
        const evolutionResult = await synthesizeSoulstateFromMemory();
        
        if (evolutionResult) {
          // Apply the evolution
          const appliedEvolution = await applySoulstateEvolution();
          setCycleResults(prev => ({ 
            ...prev, 
            soulstateEvolution: evolutionResult,
            appliedEvolution 
          }));
        }
      } else {
        addSystemMessage("Note: Soulstate evolution is not yet ready - it was recently evolved and needs time to settle.");
      }
      
      return true;
    } catch (error) {
      console.error('Error evolving soulstate:', error);
      // Continue with cycle even if this step fails
      return true;
    }
  };
};
