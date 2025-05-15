
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal, Loader2 } from 'lucide-react';
import { useChat } from '@/contexts/chat';
import { useToast } from '@/hooks/use-toast';

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const recentToastsRef = useRef<{[key: string]: number}>({});

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
  
  // Function to prevent duplicate toasts
  const showToast = (title: string, message: string, variant: 'default' | 'destructive' = 'default') => {
    const key = `${title}-${message}`;
    const now = Date.now();
    
    // Only show toast if it hasn't been shown in the last 5 seconds
    if (!recentToastsRef.current[key] || now - recentToastsRef.current[key] > 5000) {
      toast({
        title,
        description: message,
        variant
      });
      
      recentToastsRef.current[key] = now;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isTyping || isSubmitting) return;

    console.log("ChatInput: Submitting message:", message);
    const messageCopy = message.trim();
    setMessage('');
    setIsSubmitting(true);
    
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
        showToast("Message Error", "Failed to send message. Please try again.", "destructive");
      }
    } finally {
      // Ensure we reset the submission state after a delay
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
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
          disabled={isTyping || isSubmitting}
        />
        <Button
          type="submit"
          className="absolute right-2 bottom-2 rounded-full"
          disabled={isTyping || isSubmitting}
        >
          {isTyping || isSubmitting ? (
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
