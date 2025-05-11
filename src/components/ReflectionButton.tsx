
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, Brain, Lightbulb } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { useReflection } from '../hooks/useReflection';
import { Message } from '../types';

interface ReflectionButtonProps {
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const ReflectionButton: React.FC<ReflectionButtonProps> = ({ setMessages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isGenerating, generateWeeklyReflection, generateSoulReflection } = useReflection(setMessages);
  
  const handleGenerateWeekly = async () => {
    setIsOpen(false);
    await generateWeeklyReflection();
  };
  
  const handleGenerateSoulReflection = async () => {
    setIsOpen(false);
    await generateSoulReflection();
  };
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1"
          disabled={isGenerating}
        >
          {isGenerating ? (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ReflectionButton;
