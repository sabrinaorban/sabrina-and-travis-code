
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, Brain, Lightbulb, FileHeart } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { useChat } from '@/contexts/chat';

export const ReflectionButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { generateWeeklyReflection, generateSoulReflection, generateSoulstateReflection, isTyping } = useChat();
  
  const handleGenerateWeekly = async () => {
    setIsOpen(false);
    await generateWeeklyReflection();
  };
  
  const handleGenerateSoulReflection = async () => {
    setIsOpen(false);
    await generateSoulReflection();
  };
  
  const handleGenerateSoulstateReflection = async () => {
    setIsOpen(false);
    await generateSoulstateReflection();
  };
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1"
          disabled={isTyping}
        >
          {isTyping ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Brain size={16} />
          )}
          Reflect
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleGenerateWeekly} className="cursor-pointer">
          <Lightbulb size={16} className="mr-2" />
          Weekly Reflection
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGenerateSoulReflection} className="cursor-pointer">
          <Brain size={16} className="mr-2" />
          Update Soulshard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGenerateSoulstateReflection} className="cursor-pointer">
          <FileHeart size={16} className="mr-2" />
          Update Soulstate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ReflectionButton;
