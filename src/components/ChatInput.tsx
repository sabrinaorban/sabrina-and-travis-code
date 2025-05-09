
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, BookOpen, FilePlus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '../contexts/ChatContext';
import { SpecialDocumentUpload } from './SpecialDocumentUpload';

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const { sendMessage, isTyping, summarizeConversation } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isTyping) return;
    
    await sendMessage(message);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t">
        <div className="flex items-center">
          <SpecialDocumentUpload />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={summarizeConversation}
            disabled={isTyping}
            className="flex items-center gap-2 ml-2"
          >
            <BookOpen size={16} />
            <span>Summarize Conversation</span>
          </Button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-white p-4 border-t">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message to Travis..."
          className="resize-none min-h-[50px] max-h-[150px] flex-grow"
          disabled={isTyping}
        />
        <Button type="submit" size="icon" disabled={!message.trim() || isTyping}>
          <Send size={18} />
        </Button>
      </form>
    </>
  );
};
