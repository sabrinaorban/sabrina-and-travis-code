
import { Message } from '@/types';

/**
 * Hook for recovering from errors in chat
 */
export const useChatRecovery = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  sendMessageFunc: (content: string) => Promise<void>
) => {
  const retryMessage = async (lastMessage: Message): Promise<void> => {
    if (!lastMessage) return;

    if (lastMessage.role === 'user') {
      // Retry sending the user message
      await sendMessageFunc(lastMessage.content);
    } else {
      console.log('Cannot retry non-user message');
    }
  };

  return {
    retryMessage
  };
};
