
import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { useChat } from '../contexts/ChatContext';

export const ChatHistory: React.FC = () => {
  const { messages, isTyping } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change or when typing starts/stops
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-gray-400">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Welcome to Travis!</h3>
            <p>Start a conversation with your AI development assistant.</p>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))
      )}
      
      {isTyping && (
        <div className="flex items-start mb-4">
          <div className="bg-travis-light text-gray-800 rounded-lg p-4 max-w-[80%]">
            <div className="flex items-center mb-1">
              <span className="font-semibold">Travis</span>
            </div>
            <div className="typing-indicator mt-2">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};
