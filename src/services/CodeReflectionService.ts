
import { supabase } from '@/lib/supabase';
import { CodeReflectionDraft, CodeReflectionResult } from '@/types/code-reflection';
import { FileEntry } from '@/types';

/**
 * Service for code reflection and evolution operations
 */
export const CodeReflectionService = {
  /**
   * Store a new code reflection draft in the database
   */
  async storeDraft(draft: Omit<CodeReflectionDraft, 'id' | 'created_at'>): Promise<CodeReflectionResult> {
    try {
      const { data, error } = await supabase
        .from('code_reflection_drafts')
        .insert({
          file_path: draft.file_path,
          original_code: draft.original_code,
          proposed_code: draft.proposed_code,
          reason: draft.reason
        })
        .select('*')
        .single();

      if (error) throw error;
      
      return {
        success: true,
        draft: data as CodeReflectionDraft
      };
    } catch (error) {
      console.error('Error storing code reflection draft:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get all code reflection drafts
   */
  async getDrafts(): Promise<CodeReflectionDraft[]> {
    try {
      const { data, error } = await supabase
        .from('code_reflection_drafts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data as CodeReflectionDraft[];
    } catch (error) {
      console.error('Error fetching code reflection drafts:', error);
      return [];
    }
  },

  /**
   * Get a specific code reflection draft by ID
   */
  async getDraftById(id: string): Promise<CodeReflectionDraft | null> {
    try {
      const { data, error } = await supabase
        .from('code_reflection_drafts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      return data as CodeReflectionDraft;
    } catch (error) {
      console.error('Error fetching code reflection draft:', error);
      return null;
    }
  },

  /**
   * Delete a code reflection draft
   */
  async deleteDraft(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('code_reflection_drafts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting code reflection draft:', error);
      return false;
    }
  },
  
  /**
   * Perform code reflection analysis using edge function
   */
  async analyzeCode(code: string, filePath: string): Promise<CodeReflectionResult> {
    try {
      // Get current session for the access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';
      
      // Call the edge function with proper API key in headers
      const { data, error } = await supabase.functions.invoke('code-reflection-analysis', {
        body: { code, filePath },
        headers: {
          // Use the key from the supabase client
          apikey: supabase.supabaseKey,
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (error) throw error;
      
      return {
        success: true,
        draft: data,
        insight: data.insight
      };
    } catch (error) {
      console.error('Error analyzing code with edge function:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
