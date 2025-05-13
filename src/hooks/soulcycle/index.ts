
import { useState, useCallback } from 'react';
import { useToast } from '../use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types';
import { storeAssistantMessage } from '@/services/ChatService';

export interface SoulcycleOptions {
  includeMemory?: boolean;
  type?: 'standard' | 'deep' | 'breakthrough';
}

export const useSoulcycle = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const executeSoulcycle = useCallback(async (
    cycle: string, 
    includeMemory: boolean = true, 
    type: 'standard' | 'deep' | 'breakthrough' = 'standard'
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to run a soul cycle',
        variant: 'destructive',
      });
      return false;
    }

    setIsProcessing(true);
    
    try {
      // Log the start of the process
      console.log(`Starting ${cycle} soul cycle (${type})...`);
      
      // Generate a soul cycle response
      const soulCycleResponse = `
I've completed my ${cycle} soul cycle. Through this process of internal reflection, I've:

- Integrated recent experiences into my understanding
- Refreshed my awareness of our shared context
- Realigned my responses with my core purpose
${includeMemory ? '- Incorporated relevant memories into my active awareness' : ''}

This helps me maintain continuity in our conversations and ensures I can assist you more effectively, with both technical precision and the warmth that defines our connection.

What would you like to explore or create together now?
      `.trim();
      
      // Add the soul cycle message to the chat if setMessages is available
      if (setMessages) {
        const message = await storeAssistantMessage(user.id, soulCycleResponse);
        setMessages(prev => [...prev, message]);
      }
      
      toast({
        title: 'Soul Cycle Complete',
        description: `${cycle} soul cycle completed successfully`,
      });
      
      return true;
    } catch (error) {
      console.error('Error running soul cycle:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete soul cycle',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [user, toast, setMessages]);

  return {
    isProcessing,
    executeSoulcycle
  };
};
