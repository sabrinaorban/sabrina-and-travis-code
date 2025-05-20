
import { useState } from 'react';
import { Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useSoulstateManagement } from './useSoulstateManagement';
import { Reflection } from '../types/reflection';
import { useTaskManager } from './useTaskManager'; // Import TaskManager hook

export const useReflection = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateSoulstate, generateSoulstateSummary } = useSoulstateManagement();
  const { getTasksByStatus } = useTaskManager(); // Add task manager functions
  
  // Get the latest reflection of a specific type
  const getLatestReflection = async (type: string = 'weekly'): Promise<Reflection | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('reflections')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Validate the reflection type to ensure it matches the expected union type
        const reflectionData = data[0];
        const validType = ['weekly', 'soulshard', 'soulstate', 'custom'].includes(reflectionData.type)
          ? (reflectionData.type as 'weekly' | 'soulshard' | 'soulstate' | 'custom')
          : 'custom'; // Default to 'custom' if the type is invalid
          
        // Handle source_context properly - ensure it's an object or null
        let processedSourceContext: Record<string, any> | undefined = undefined;
        
        if (reflectionData.source_context !== null) {
          // If it's already an object, keep it as is
          if (typeof reflectionData.source_context === 'object' && reflectionData.source_context !== null) {
            processedSourceContext = reflectionData.source_context as Record<string, any>;
          } 
          // If it's a JSON string, parse it
          else if (typeof reflectionData.source_context === 'string') {
            try {
              processedSourceContext = JSON.parse(reflectionData.source_context);
            } catch (e) {
              console.error('Failed to parse source_context as JSON:', e);
              processedSourceContext = { raw: reflectionData.source_context };
            }
          }
          // For any other type, wrap it in an object
          else {
            processedSourceContext = { value: reflectionData.source_context };
          }
        }
          
        // Return a properly typed reflection
        return {
          ...reflectionData,
          type: validType,
          source_context: processedSourceContext
        };
      }
      
      return null;
    } catch (error: any) {
      console.error('Error fetching latest reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch the latest reflection',
        variant: 'destructive',
      });
      return null;
    }
  };
  
  // Weekly reflection generation with task awareness
  const generateWeeklyReflection = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to generate reflections',
        variant: 'destructive',
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Get current tasks for context - properly await all task-related Promises
      const inProgressTasks = await getTasksByStatus('in_progress');
      const pendingTasks = await getTasksByStatus('pending');
      const completedTasks = await getTasksByStatus('done');
      const blockedTasks = await getTasksByStatus('blocked');
      
      // Create task summary if tasks exist
      let taskSummary = null;
      if (inProgressTasks.length > 0 || pendingTasks.length > 0 || completedTasks.length > 0) {
        taskSummary = {
          in_progress: inProgressTasks.length,
          pending: pendingTasks.length,
          completed: completedTasks.length,
          blocked: blockedTasks.length,
          in_progress_details: inProgressTasks.map(t => t.title),
          pending_details: pendingTasks.map(t => t.title).slice(0, 5) // Limit to avoid overly large payloads
        };
      }
      
      // Call Supabase Edge Function with task context
      const { data, error } = await supabase.functions.invoke('reflect', {
        body: { 
          type: 'weekly',
          userId: user.id,
          taskContext: taskSummary
        }
      });
      
      if (error) throw error;
      
      // Add the reflection to the chat as a message from Travis
      if (setMessages && data.reflection) {
        const reflectionMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `Weekly Reflection:\n\n${data.reflection.content}`,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, reflectionMessage]);
      }
      
      toast({
        title: 'Weekly Reflection Generated',
        description: 'Travis has reflected on recent conversations and tasks',
      });
      
      return data.reflection;
    } catch (error: any) {
      console.error('Error generating weekly reflection:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate weekly reflection',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Soulshard reflection/update
  const generateSoulReflection = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update Travis\'s soulshard',
        variant: 'destructive',
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('reflect', {
        body: { 
          type: 'soulshard',
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      // Add the reflection to the chat as a message from Travis
      if (setMessages && data.reflection) {
        const reflectionMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `Soulshard Update:\n\n${data.reflection.content}`,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, reflectionMessage]);
      }
      
      toast({
        title: 'Soulshard Updated',
        description: 'Travis has evolved his core identity',
      });
      
      return data.reflection;
    } catch (error: any) {
      console.error('Error updating soulshard:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update soulshard',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Soulstate reflection/update
  const generateSoulstateReflection = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update Travis\'s soulstate',
        variant: 'destructive',
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('reflect', {
        body: { 
          type: 'soulstate',
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      // Update the soulstate file with the reflection results
      if (data.soulstate) {
        await updateSoulstate(data.soulstate);
      }
      
      // Add the reflection to the chat as a message from Travis
      if (setMessages && data.reflection) {
        const reflectionMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `Soulstate Update:\n\n${data.reflection.content}`,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, reflectionMessage]);
      }
      
      toast({
        title: 'Soulstate Updated',
        description: 'Travis has evolved his emotional and existential state',
      });
      
      return data.reflection;
    } catch (error: any) {
      console.error('Error updating soulstate:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update soulstate',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateSummary,
    generateSoulstateReflection,
    getLatestReflection
  };
};
