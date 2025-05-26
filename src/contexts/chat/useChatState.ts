
import { useState, useRef } from 'react';
import { Message } from '@/types';

export const useChatState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEvolutionProposal, setCurrentEvolutionProposal] = useState<any>();
  const [isEvolutionChecking, setIsEvolutionChecking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const lastMessage = useRef<Message | null>(null);

  const clearError = () => {
    setError(null);
  };

  return {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    isLoading,
    setIsLoading,
    error,
    setError,
    clearError,
    currentEvolutionProposal,
    setCurrentEvolutionProposal,
    isEvolutionChecking,
    setIsEvolutionChecking,
    isLoadingHistory,
    setIsLoadingHistory,
    lastMessage
  };
};
