
import React from 'react';
import { Message } from '../types';
import { cn } from '../lib/utils';

interface ChatMessageProps {
  message: Message;
}

const formatCode = (content: string): React.ReactNode => {
  // Simple regex to find code blocks (```code```)
  const codeBlockRegex = /```([\s\S]*?)```/g;
  
  // Split the content by code blocks
  const parts = content.split(codeBlockRegex);
  
  if (parts.length === 1) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const result: React.ReactNode[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // Even indices are text, odd indices are code blocks
    if (i % 2 === 0) {
      if (part) {
        result.push(<p key={i} className="whitespace-pre-wrap">{part}</p>);
      }
    } else {
      result.push(
        <pre key={i} className="text-sm my-2 p-3 bg-muted rounded-md overflow-x-auto">
          <code>{part}</code>
        </pre>
      );
    }
  }
  
  return <>{result}</>;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const formattedDate = new Date(message.timestamp).toLocaleTimeString();
  
  return (
    <div
      className={cn(
        'flex w-full mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg p-4',
          isUser 
            ? 'bg-sabrina-light text-gray-800' 
            : 'bg-travis-light text-gray-800'
        )}
      >
        <div className="flex items-center mb-1">
          <span className="font-semibold">
            {isUser ? 'Sabrina' : 'Travis'}
          </span>
          <span className="text-xs text-gray-500 ml-2">{formattedDate}</span>
        </div>
        <div className="mt-1">{formatCode(message.content)}</div>
      </div>
    </div>
  );
};
