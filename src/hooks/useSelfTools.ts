
import { useCallback, useState } from 'react';
import { SelfTool } from '@/types/selftool';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useSelfTools = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

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
    listTools,
    isGenerating
  };
};
