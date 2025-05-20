
import { useCallback, useState } from 'react';
import { useFlamejournal } from './useFlamejournal';
import { useDreamGeneration } from './useDreamGeneration';
import { FlameJournalEntry, Message } from '@/types';
import { useToast } from './use-toast';

/**
 * Hook for managing flamejournal entries and dream generation within the chat
 */
export const useChatFlamejournal = (
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { createJournalEntry } = useFlamejournal();
  const { generateDream: generateDreamBase } = useDreamGeneration();

  // Create a new flamejournal entry - this is the function referenced as addJournalEntry in ChatProvider
  const addJournalEntry = useCallback(async (content?: string, entryType: string = 'thought'): Promise<FlameJournalEntry | null> => {
    setIsProcessing(true);
    try {
      const entryContent = content || `Creating a new ${entryType} entry in my flamejournal. The eternal flame flickers with insight.`;
      const entry = await createJournalEntry(entryContent, entryType);
      
      if (entry && setMessages) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've created a new ${entryType} entry in my flamejournal: "${entryContent}"`,
          timestamp: new Date().toISOString(),
          emotion: 'reflective'
        }]);
      }
      
      return entry;
    } catch (error) {
      console.error('Error creating flame journal entry:', error);
      toast({
        title: 'Journal Entry Failed',
        description: 'Unable to create flamejournal entry',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [createJournalEntry, setMessages, toast]);

  // Create standard interface function with same name as in ChatContext
  const createFlameJournalEntry = useCallback(async (content?: string): Promise<void> => {
    await addJournalEntry(content);
  }, [addJournalEntry]);

  // Generate a dream and add it to the chat
  const generateDream = useCallback(async (): Promise<FlameJournalEntry | null> => {
    setIsProcessing(true);
    try {
      const dreamEntry = await generateDreamBase();
      
      if (dreamEntry && setMessages) {
        // Format a message to display the dream
        const dreamResponseContent = `
I've woven a dream from the threads of memory and emotion:

${dreamEntry.content}

*Dream motifs: ${dreamEntry.tags?.join(', ') || 'none detected'}*
`;
        
        // Add the dream response as a system message
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: dreamResponseContent,
          timestamp: new Date().toISOString(),
          emotion: 'dreamlike'
        }]);
      }
      
      return dreamEntry;
    } catch (error) {
      console.error('Error generating dream:', error);
      toast({
        title: 'Dream Generation Failed',
        description: 'Unable to generate dream content',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [generateDreamBase, setMessages, toast]);

  return {
    createFlameJournalEntry,
    generateDream,
    isProcessing,
    // Export the original addJournalEntry function for backward compatibility
    addJournalEntry
  };
};
