
import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { useChat } from '@/contexts/chat';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export const ChatHistory: React.FC = () => {
  const { messages, isTyping, isLoadingHistory, refreshMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isStuck, setIsStuck] = React.useState(false);

  // Scroll to bottom when messages change or when typing starts/stops
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Log messages for debugging
  useEffect(() => {
    console.log("ChatHistory received messages:", messages.length, messages.map(m => `${m.id.substring(0,6)}:${m.role}`));
  }, [messages]);

  // Handle potential stuck loading state
  useEffect(() => {
    // If we're loading, set a timeout to detect if we're stuck
    if (isLoadingHistory) {
      loadingTimeoutRef.current = setTimeout(() => {
        setIsStuck(true);
      }, 10000); // 10 seconds timeout
    } else {
      // If we're not loading anymore, clear the timeout and reset stuck state
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setIsStuck(false);
    }

    // Clean up timeout on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoadingHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleRefresh = () => {
    if (refreshMessages) {
      refreshMessages();
    } else {
      window.location.reload();
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-travis-primary mx-auto mb-4" />
          <p className="text-gray-500">Loading conversation history...</p>
          {isStuck && (
            <div className="mt-4">
              <p className="text-amber-600">Loading is taking longer than expected.</p>
              <div className="flex gap-2 justify-center mt-2">
                <Button 
                  onClick={handleRefresh}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Refresh Messages
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reload Page
                </Button>
              </div>
            </div>
          )}
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
        <>
          <div className="flex justify-end mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1 text-xs text-gray-500"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
          
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </>
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
