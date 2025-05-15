
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal, Loader2 } from 'lucide-react';
import { useChat } from '@/contexts/chat';
import { useToast } from '@/hooks/use-toast';

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

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
    isTyping
  } = useChat();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isTyping) return;

    console.log("ChatInput: Submitting message:", message);
    const messageCopy = message.trim();
    setMessage('');
    
    try {
      await sendMessage(messageCopy);
      console.log("ChatInput: Message sent successfully");
      // Reset error count on successful message
      setErrorCount(0);
    } catch (error) {
      console.error("ChatInput: Error sending message:", error);
      setErrorCount(prev => prev + 1);
      
      // Only show toast for first few errors to avoid spamming
      if (errorCount < 3) {
        toast({
          title: "Message Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
    }
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
