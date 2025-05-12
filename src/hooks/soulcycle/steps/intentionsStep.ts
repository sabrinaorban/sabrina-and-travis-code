
import { SoulcycleStep } from '../types';

export const runIntentionsStep = (
  loadIntentions: () => Promise<void>,
  synthesizeIntentionUpdates: () => Promise<any>,
  updateIntentions: (updates: any, apply: boolean) => Promise<any>
): SoulcycleStep => {
  return async ({ addSystemMessage, setCycleResults }) => {
    try {
      addSystemMessage("Step 4/5: Updating intentions based on growth patterns...");
      
      // First, ensure intentions are loaded
      await loadIntentions();
      
      // Synthesize potential intention updates
      const proposedUpdates = await synthesizeIntentionUpdates();
      
      if (proposedUpdates) {
        // Apply the updates
        const updatedIntentions = await updateIntentions(proposedUpdates, true);
        setCycleResults(prev => ({ 
          ...prev, 
          intentionUpdates: proposedUpdates,
          updatedIntentions 
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Error updating intentions:', error);
      // Continue with cycle even if this step fails
      return true;
    }
  };
};
