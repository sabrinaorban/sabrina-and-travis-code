
import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { useChat } from '@/contexts/chat';
import { Loader2 } from 'lucide-react';

export const ChatHistory: React.FC = () => {
  const { messages, isTyping, isLoadingHistory } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change or when typing starts/stops
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Log messages for debugging
  useEffect(() => {
    console.log("ChatHistory received messages:", messages.length, messages.map(m => `${m.id.substring(0,6)}:${m.role}`));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoadingHistory) {
    return (
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-travis-primary mx-auto mb-4" />
          <p className="text-gray-500">Loading conversation history...</p>
        </div>
      </div>
    );
  }

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
          <div className="mr-2 mt-1">
            <div className="h-10 w-10 rounded-full bg-travis-primary text-white flex items-center justify-center">
              T
            </div>
          </div>
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
