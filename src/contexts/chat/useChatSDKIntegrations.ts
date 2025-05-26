
import { useChatReflection } from '@/hooks/useChatReflection';
import { useChatEvolution } from '@/hooks/useChatEvolution';
import { useChatTools } from './useChatTools';
import { useChatFlamejournal } from '@/hooks/useChatFlamejournal';
import { useTravisFileOperations } from '@/hooks/useTravisFileOperations';
import { Message } from '@/types';

export const useChatSDKIntegrations = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  // SDK Hooks
  const { generateWeeklyReflection, generateSoulReflection } = useChatReflection(setMessages);
  const { checkForEvolutionCycle, isEvolutionChecking: evolutionIsChecking } = useChatEvolution(setMessages);  
  const { generateTool, useTool, reflectOnTool, reviseTool } = useChatTools(setMessages);
  const { addJournalEntry } = useChatFlamejournal(setMessages);

  // File operations hook
  const {
    readFile,
    writeFile,
    listFiles,
    isProcessing: isProcessingFiles
  } = useTravisFileOperations(setMessages);

  return {
    generateWeeklyReflection,
    generateSoulReflection,
    checkForEvolutionCycle,
    evolutionIsChecking,
    generateTool,
    useTool,
    reflectOnTool,
    reviseTool,
    addJournalEntry,
    readFile,
    writeFile,
    listFiles,
    isProcessingFiles
  };
};
