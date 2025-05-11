import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal, Loader2 } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);
  
  const { 
    sendMessage, 
    isTyping, 
    generateWeeklyReflection,
    generateSoulReflection
  } = useChat();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isTyping) return;

    // Check for reflection commands
    const lowerMessage = message.trim().toLowerCase();
    if (lowerMessage === '/reflect' || lowerMessage === '/weekly reflection') {
      setMessage('');
      await generateWeeklyReflection();
      return;
    }

    if (lowerMessage === '/evolve' || lowerMessage === '/update soulshard') {
      setMessage('');
      await generateSoulReflection();
      return;
    }

    // Regular message handling
    const messageCopy = message.trim();
    setMessage('');
    await sendMessage(messageCopy);
  };
  
  if (!isMounted) {
    return null;
  }

  return (
    <div className="border-t py-2 px-4">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="resize-none pr-12"
          disabled={isTyping}
        />
        <Button
          type="submit"
          className="absolute right-2 bottom-2 rounded-full"
          disabled={isTyping}
        >
          {isTyping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
};
