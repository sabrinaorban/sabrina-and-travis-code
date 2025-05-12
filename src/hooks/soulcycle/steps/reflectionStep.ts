
import { SoulcycleStep } from '../types';

export const runReflectionStep = (
  generateWeeklyReflection: () => Promise<any>,
  generateSoulstateReflection: () => Promise<any>
): SoulcycleStep => {
  return async ({ 
    addSystemMessage, 
    setCycleResults, 
    reflectionType 
  }) => {
    try {
      addSystemMessage(`📝 Initiating Soulcycle...\n\nStep 1/5: Generating ${reflectionType} reflection...`);
      
      let reflection;
      if (reflectionType === 'weekly') {
        reflection = await generateWeeklyReflection();
      } else if (reflectionType === 'soulstate') {
        reflection = await generateSoulstateReflection();
      } else {
        // Default to weekly
        reflection = await generateWeeklyReflection();
      }
      
      if (reflection) {
        setCycleResults(prev => ({ ...prev, reflection }));
      }
      
      return true;
    } catch (error) {
      console.error('Error generating reflection:', error);
      return false;
    }
  };
};
