
import { supabase, supabaseKey } from '@/lib/supabase';
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
          reason: draft.reason,
          reflection_type: draft.reflection_type || 'file'
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
      
      console.log(`Analyzing code for file: ${filePath}`);
      
      // Call the edge function with proper API key in headers
      const { data, error } = await supabase.functions.invoke('code-reflection-analysis', {
        body: { code, filePath },
        headers: {
          apikey: supabaseKey || '',
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (error) throw error;
      
      // After successful analysis, store in flamejournal if it has reflection data
      if (data && data.file_path && data.insight) {
        console.log('Storing code reflection in flamejournal:', data.file_path);
        await this.storeCodeReflectionJournal(
          data.insight, 
          data.tags || ['code_reflection', 'file'], 
          {
            file: data.file_path,
            reflectionType: 'file'
          }
        );
      }
      
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
  },

  /**
   * Analyze a folder of code files for architectural insights
   */
  async analyzeFolderCode(files: { path: string, content: string }[], folderPath: string): Promise<CodeReflectionResult> {
    try {
      // Get current session for the access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';
      
      console.log(`Analyzing folder: ${folderPath} with ${files.length} files`);
      console.log(`Files to analyze:`, files.map(f => f.path).join(', '));
      
      if (files.length === 0) {
        return {
          success: false,
          error: `No files to analyze in folder: ${folderPath}`
        };
      }
      
      // Call the edge function with proper API key in headers
      const { data, error } = await supabase.functions.invoke('code-reflection-analysis', {
        body: { 
          isFolder: true,
          folderPath,
          files 
        },
        headers: {
          apikey: supabaseKey || '',
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }
      
      console.log('Received response from edge function:', data ? Object.keys(data).join(', ') : 'No data');
      
      // After successful analysis, always store folder reflection in flamejournal
      if (data && data.full_reflection) {
        console.log('Storing folder reflection in flamejournal:', folderPath);
        const tags = data.tags || ['structure', 'architecture', 'code_reflection', 'folder'];
        const result = await this.storeCodeReflectionJournal(
          data.full_reflection,
          tags,
          {
            folder: folderPath,
            reflectionType: 'folder'
          }
        );
        console.log('Flamejournal storage result:', result ? 'success' : 'failed');
      } else {
        console.error('Missing full_reflection in response from edge function');
      }
      
      return {
        success: true,
        draft: data,
        insight: data.insight || 'Architectural patterns analyzed across multiple files'
      };
    } catch (error) {
      console.error('Error analyzing folder code with edge function:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Store a code reflection journal entry
   */
  async storeCodeReflectionJournal(content: string, tags: string[] = [], sourceContext: Record<string, any> = {}): Promise<boolean> {
    try {
      console.log('Storing code reflection in flamejournal with tags:', tags);
      
      if (!content) {
        console.error('Cannot store empty content in flamejournal');
        return false;
      }
      
      // Ensure the code_reflection tag is always present
      if (!tags.includes('code_reflection')) {
        tags.push('code_reflection');
      }
      
      // For folders, ensure the folder tag is present
      if (sourceContext.reflectionType === 'folder' && !tags.includes('folder')) {
        tags.push('folder');
      }
      
      // Store directly in the flamejournal table
      const { error } = await supabase
        .from('flamejournal')
        .insert({
          content,
          entry_type: 'code_reflection', 
          tags,
          metadata: sourceContext // Store source context in metadata
        });
      
      if (error) {
        console.error('Error inserting into flamejournal table:', error);
        throw error;
      }
      
      console.log('Successfully stored code reflection in flamejournal');
      return true;
    } catch (error) {
      console.error('Error storing code reflection journal:', error);
      return false;
    }
  }
};
