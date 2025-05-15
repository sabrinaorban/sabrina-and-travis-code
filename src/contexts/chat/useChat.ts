
import { useContext } from 'react';
import { ChatContext } from './ChatContext';

export const useChat = () => {
  const context = useContext(ChatContext);
  
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  
  // Destructure the context to provide a clean API
  const {
    messages,
    sendMessage,
    isTyping,
    memoryContext,
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary,
    generateSoulstateReflection,
    createFlameJournalEntry,
    initiateSoulstateEvolution,
    viewIntentions,
    updateIntentions,
    runSoulcycle,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations,
    generateInsight,
    checkEvolutionCycle,
    currentEvolutionProposal,
    isEvolutionChecking,
  } = context;
  
  return {
    messages,
    sendMessage,
    isTyping,
    memoryContext,
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary,
    generateSoulstateReflection,
    createFlameJournalEntry,
    initiateSoulstateEvolution,
    viewIntentions,
    updateIntentions,
    runSoulcycle,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations,
    generateInsight,
    // Expose evolution cycle functionality
    checkEvolutionCycle,
    currentEvolutionProposal,
    isEvolutionChecking,
  };
};
