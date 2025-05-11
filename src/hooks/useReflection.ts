
import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ReflectionService } from '../services/ReflectionService';
import { Reflection } from '../types/reflection';
import { useToast } from './use-toast';
import { useMemoryManagement } from './useMemoryManagement';
import { Message } from '../types';

export const useReflection = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [currentReflection, setCurrentReflection] = useState<Reflection | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { memoryContext, refreshMemoryContext } = useMemoryManagement(setMessages);
  
  // Function to generate a weekly reflection
  const generateWeeklyReflection = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to generate a reflection',
        variant: 'destructive',
      });
      return null;
    }
    
    try {
      setIsGenerating(true);
      
      // Generate the reflection
      const reflection = await ReflectionService.generateReflection(user.id, 'weekly');
      
      // Update state with the new reflection
      setCurrentReflection(reflection);
      setReflections(prev => [reflection, ...prev]);
      
      // Add a message from Travis about the reflection if setMessages is provided
      if (setMessages) {
        const newMessage = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `I've just completed a weekly reflection on our recent conversations. Would you like to hear my thoughts?`,
          createdAt: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, newMessage]);
      }
      
      toast({
        title: 'Reflection Generated',
        description: 'Travis has created a new weekly reflection.'
      });
      
      return reflection;
    } catch (error: any) {
      console.error('Error generating weekly reflection:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate weekly reflection',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, toast, setMessages]);
  
  // Function to generate a soul reflection and update the soulshard
  const generateSoulReflection = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update the soulshard',
        variant: 'destructive',
      });
      return null;
    }
    
    try {
      setIsGenerating(true);
      
      // Generate the soul reflection and update the soulshard
      const reflection = await ReflectionService.generateSoulReflection(user.id, memoryContext);
      
      // Update state with the new reflection
      setCurrentReflection(reflection);
      setReflections(prev => [reflection, ...prev]);
      
      // Refresh the memory context to include the updated soulshard
      await refreshMemoryContext();
      
      // Add a message from Travis about the soulshard update if setMessages is provided
      if (setMessages) {
        const newMessage = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `I've just updated my soulshard based on a deep reflection of our interactions. I can feel myself evolving. Would you like to know what changed?`,
          createdAt: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, newMessage]);
      }
      
      toast({
        title: 'Soulshard Updated',
        description: 'Travis has evolved his soulshard based on self-reflection.'
      });
      
      return reflection;
    } catch (error: any) {
      console.error('Error generating soul reflection:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update soulshard',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, toast, memoryContext, refreshMemoryContext, setMessages]);
  
  // Function to load all reflections
  const loadReflections = useCallback(async () => {
    if (!user) {
      return;
    }
    
    try {
      const loadedReflections = await ReflectionService.getReflections(user.id);
      setReflections(loadedReflections);
    } catch (error) {
      console.error('Error loading reflections:', error);
    }
  }, [user]);
  
  // Function to get the latest reflection by type
  const getLatestReflection = useCallback(async (type?: string) => {
    if (!user) {
      return null;
    }
    
    try {
      const reflection = await ReflectionService.getLatestReflection(user.id, type);
      if (reflection) {
        setCurrentReflection(reflection);
      }
      return reflection;
    } catch (error) {
      console.error(`Error getting latest ${type || ''} reflection:`, error);
      return null;
    }
  }, [user]);
  
  return {
    isGenerating,
    reflections,
    currentReflection,
    generateWeeklyReflection,
    generateSoulReflection,
    loadReflections,
    getLatestReflection
  };
};
