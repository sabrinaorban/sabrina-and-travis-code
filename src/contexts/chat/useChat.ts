
import { useContext } from 'react';
import { ChatContext } from './ChatContext';

export const useChat = () => {
  return useContext(ChatContext);
};
