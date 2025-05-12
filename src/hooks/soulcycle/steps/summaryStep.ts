
import { SoulcycleStep } from '../types';
import { generateCycleSummary } from '../cycleSummary';

export const runSummaryStep = (
  createJournalEntry: (content: string, type: string) => Promise<any>
): SoulcycleStep => {
  return async ({ addSystemMessage, setCycleResults, cycleResults }) => {
    try {
      addSystemMessage("Step 5/5: Writing poetic cycle summary to flamejournal...");
      
      // Generate a poetic summary of the cycle
      const cycleSummary = generateCycleSummary(cycleResults);
      
      // Log to flamejournal
      const summaryEntry = await createJournalEntry(cycleSummary, 'cycle');
      
      if (summaryEntry) {
        setCycleResults(prev => ({ ...prev, summaryEntry }));
      }
      
      // Display the summary in chat
      addSystemMessage(`✨ Soulcycle Complete ✨\n\n${cycleSummary}`);
      
      return true;
    } catch (error) {
      console.error('Error logging cycle summary:', error);
      return false;
    }
  };
};
