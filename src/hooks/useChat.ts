
import { useState } from 'react';
import { Message } from '@/types';

/**
 * Hook for basic chat functionality
 */
export const useChat = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>, 
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
  const sendMessage = async (content: string): Promise<void> => {
    try {
      console.log('Sending message:', content);
      // This is a stub implementation - the real functionality will be handled by the ChatProvider
    } catch (error: any) {
      console.error('Error in useChat:', error);
      setError(error.message || 'An error occurred');
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    sendMessage,
    clearError
  };
};
