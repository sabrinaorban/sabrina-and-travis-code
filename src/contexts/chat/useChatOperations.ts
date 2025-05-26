
import { useCallback } from 'react';
import { Message } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

export const useChatOperations = (
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  sendMessageSDK: (content: string) => Promise<void>,
  lastMessage: React.MutableRefObject<Message | null>
) => {
  const { toast } = useToast();

  const clearMessages = useCallback(async () => {
    setMessages([]);
  }, [setMessages]);

  const summarizeConversation = useCallback(async () => {
    try {
      // Prepare the conversation history for summarization
      const conversationHistory = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

      // Call the Supabase function to summarize the conversation
      const { data, error } = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation: conversationHistory }),
      }).then(res => res.json());

      if (error) {
        console.error('Error summarizing conversation:', error);
        return;
      }

      // Add the summary to the chat
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: `Here's a summary of our conversation:\n${data.summary}`,
        timestamp: new Date().toISOString(),
        emotion: 'informative'
      }]);
    } catch (err) {
      console.error('Error summarizing conversation:', err);
    }
  }, [messages, setMessages]);

  const sendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim()) return;

    const newMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      emotion: 'neutral'
    };

    setMessages(prev => [...prev, newMessage]);
    await sendMessageSDK(messageContent);
  }, [sendMessageSDK, setMessages]);

  const retryMessage = useCallback(async () => {
    if (lastMessage.current) {
      // Just re-send the message content
      await sendMessageSDK(lastMessage.current.content);
    } else {
      toast({
        title: "No message to retry",
        description: "There was no last message to retry.",
      });
    }
  }, [sendMessageSDK, toast]);

  return {
    clearMessages,
    summarizeConversation,
    sendMessage,
    retryMessage
  };
};
