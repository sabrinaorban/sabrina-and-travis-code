
import React from 'react';
import { Message } from '../types';
import { Avatar } from '@/components/ui/avatar';
import { MessageBubble } from '@/components/ui/message-bubble';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  // Format timestamp
  const formattedTime = message.timestamp 
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
    : '';

  return (
    <div className={`flex items-start mb-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="mr-2 mt-1">
          <Avatar>
            <div className="h-10 w-10 rounded-full bg-travis-primary text-white flex items-center justify-center">
              T
            </div>
          </Avatar>
        </div>
      )}
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className="flex items-center mb-1">
          <span className="font-semibold">{isUser ? 'You' : 'Travis'}</span>
          <span className="text-xs text-gray-500 ml-2">{formattedTime}</span>
        </div>
        
        <MessageBubble message={message} />
      </div>
      
      {isUser && (
        <div className="ml-2 mt-1">
          <Avatar>
            <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
              S
            </div>
          </Avatar>
        </div>
      )}
    </div>
  );
};
