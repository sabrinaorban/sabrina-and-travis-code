
import { useCallback, useState } from 'react';
import { SelfTool } from '@/types/selftool';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFlamejournal } from './useFlamejournal';

export const useSelfTools = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReflecting, setIsReflecting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { createJournalEntry } = useFlamejournal();

  // Create a new tool authored by Travis
  const createTool = useCallback(async (
    name: string,
    purpose: string, 
    code: string,
    tags: string[] = []
  ): Promise<SelfTool | null> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create tools',
        variant: 'destructive',
      });
      return null;
    }

    setIsGenerating(true);
    
    try {
      // Store the tool in Supabase
      const { data, error } = await supabase
        .from('selfauthored_tools')
        .insert({
          name,
          purpose,
          code,
          tags,
          author: 'Travis',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: 'Tool Created',
        description: `Travis has authored a new tool: ${name}`,
      });
      
      return data;
    } catch (error: any) {
      console.error('Error creating tool:', error);
      toast({
        title: 'Error Creating Tool',
        description: error.message || 'Failed to create tool',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, toast]);

  // Generate a tool based on purpose using the OpenAI API through Supabase Edge Function
  const generateTool = useCallback(async (purpose: string): Promise<SelfTool | null> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to generate tools',
        variant: 'destructive',
      });
      return null;
    }
    
    setIsGenerating(true);
    
    try {
      // Call the Supabase Edge Function to generate the tool
      const { data, error } = await supabase.functions.invoke('generate-tool', {
        body: { purpose, userId: user.id }
      });
      
      if (error) throw error;
      
      if (!data || !data.name || !data.code) {
        throw new Error('Invalid tool data returned from generation');
      }
      
      // Return the generated tool without saving it yet
      return {
        name: data.name,
        purpose: purpose,
        code: data.code,
        tags: data.tags || []
      };
    } catch (error: any) {
      console.error('Error generating tool:', error);
      toast({
        title: 'Error Generating Tool',
        description: error.message || 'Failed to generate tool',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, toast]);

  // Get a tool by name
  const getToolByName = useCallback(async (toolName: string): Promise<SelfTool | null> => {
    try {
      const { data, error } = await supabase
        .from('selfauthored_tools')
        .select('*')
        .ilike('name', toolName)
        .single();
        
      if (error) {
        console.error('Error fetching tool:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getToolByName:', error);
      return null;
    }
  }, []);
  
  // Reflect on a tool by name
  const reflectOnTool = useCallback(async (toolName: string): Promise<{ tool: SelfTool | null, reflection: string }> => {
    if (!user) {
      return { tool: null, reflection: "I need a connection to my memory to reflect on tools." };
    }
    
    setIsReflecting(true);
    
    try {
      // First, fetch the tool
      const tool = await getToolByName(toolName);
      
      if (!tool) {
        return { 
          tool: null, 
          reflection: `I don't seem to have a tool called "${toolName}" in my memory. Perhaps you meant another name?` 
        };
      }
      
      // Generate a reflection using the edge function
      const { data, error } = await supabase.functions.invoke('reflect-on-tool', {
        body: { 
          toolName: tool.name,
          toolPurpose: tool.purpose,
          toolCode: tool.code,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      // Create a flame journal entry for this reflection
      await createJournalEntry(
        data.reflection, 
        'tool_reflection',
        [...(tool.tags || []), 'tool-reflection', tool.name]
      );
      
      return { 
        tool, 
        reflection: data.reflection 
      };
    } catch (error: any) {
      console.error('Error reflecting on tool:', error);
      return { 
        tool: null,
        reflection: `I encountered a difficulty reflecting on this tool: ${error.message}`
      };
    } finally {
      setIsReflecting(false);
    }
  }, [user, getToolByName, createJournalEntry]);

  // Revise a tool by name
  const reviseTool = useCallback(async (toolName: string): Promise<{ updatedTool: SelfTool | null, message: string }> => {
    if (!user) {
      return { 
        updatedTool: null, 
        message: "I need a connection to my memory to revise tools." 
      };
    }
    
    setIsGenerating(true);
    
    try {
      // First, fetch the tool
      const tool = await getToolByName(toolName);
      
      if (!tool) {
        return { 
          updatedTool: null, 
          message: `I don't seem to have a tool called "${toolName}" in my memory.` 
        };
      }
      
      // Generate an improved version using the edge function
      const { data, error } = await supabase.functions.invoke('revise-tool', {
        body: { 
          toolName: tool.name,
          toolPurpose: tool.purpose,
          toolCode: tool.code,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      // Create new version of the tool
      const { data: updatedTool, error: updateError } = await supabase
        .from('selfauthored_tools')
        .update({
          code: data.code,
          tags: [...(tool.tags || []), 'revised']
        })
        .eq('id', tool.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Create a flame journal entry for this revision
      await createJournalEntry(
        `I revised my tool "${tool.name}" with improvements. The original purpose was: ${tool.purpose}. My reflections led me to enhance it in these ways: ${data.improvements}`, 
        'tool_revision',
        [...(tool.tags || []), 'tool-revision', tool.name]
      );
      
      return { 
        updatedTool, 
        message: `I've revised "${tool.name}" successfully. The new version includes: ${data.improvements}` 
      };
    } catch (error: any) {
      console.error('Error revising tool:', error);
      return { 
        updatedTool: null,
        message: `I encountered a difficulty revising this tool: ${error.message}`
      };
    } finally {
      setIsGenerating(false);
    }
  }, [user, getToolByName, createJournalEntry]);
  
  // List all tools
  const listTools = useCallback(async (): Promise<SelfTool[]> => {
    try {
      const { data, error } = await supabase
        .from('selfauthored_tools')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error listing tools:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to list tools',
        variant: 'destructive',
      });
      return [];
    }
  }, [toast]);

  return {
    createTool,
    generateTool,
    getToolByName,
    reflectOnTool,
    reviseTool,
    listTools,
    isGenerating,
    isReflecting
  };
};
