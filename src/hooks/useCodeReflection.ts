
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { normalizePath } from '@/services/chat/fileOperations/PathUtils';
import { CodeReflectionDraft, CodeReflectionResult } from '@/types';
import { findSimilarFiles, getFileTreeDebugInfo } from '@/utils/fileSystemUtils';

export const useCodeReflection = () => {
  const [currentDraft, setCurrentDraft] = useState<CodeReflectionDraft | null>(null);
  const fileSystem = useFileSystem();
  
  const reflectOnCode = useCallback(async (filePath: string) => {
    if (!filePath) {
      console.error("Cannot reflect on code without a valid file path");
      return { 
        success: false, 
        error: "No file path provided for reflection" 
      };
    }
    
    try {
      console.log("Starting code reflection for:", filePath);
      
      // Get the file content - properly access the fileSystem 
      const normalizedPath = normalizePath(filePath);
      
      console.log("Looking for file with normalized path:", normalizedPath);
      const fileEntry = fileSystem.getFileByPath(normalizedPath);
      
      if (!fileEntry) {
        console.error(`File not found: ${normalizedPath}`);
        
        // Find similar files for suggestions
        const similarFiles = findSimilarFiles(normalizedPath, fileSystem.fileSystem.files);
        let errorMessage = `File not found at path: ${normalizedPath}`;
        
        // Add suggestions if any were found
        if (similarFiles.length > 0) {
          errorMessage += "\n\nDid you mean one of these files?";
          const suggestions = similarFiles.slice(0, 5).map(file => `- ${file.path} (${file.type})`).join("\n");
          errorMessage += `\n${suggestions}`;
          
          // Log the suggestions and available file tree for debugging
          console.log("Similar file suggestions:", similarFiles);
        } else {
          // Log the available file tree for debugging
          console.log("No similar files found. Available file tree:\n", 
            getFileTreeDebugInfo(fileSystem.fileSystem.files));
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }
      
      const fileContent = fileEntry.content;
      
      if (!fileContent) {
        console.error(`File has no content: ${normalizedPath}`);
        return { 
          success: false, 
          error: "File exists but has no content"
        };
      }
      
      console.log(`Sending ${fileContent.length} bytes for analysis`);
      
      // Call the edge function to analyze the code
      const { data, error } = await supabase.functions.invoke('code-reflection-analysis', {
        body: { 
          code: fileContent,
          filePath: normalizedPath
        }
      });
      
      if (error) {
        console.error("Error from code reflection API:", error);
        return { 
          success: false, 
          error: `API error: ${error.message}`
        };
      }
      
      console.log("Reflection API response:", data);
      
      if (!data) {
        return { 
          success: false, 
          error: "No data returned from reflection API"
        };
      }
      
      // Store the draft in the database
      const { data: draftData, error: draftError } = await supabase
        .from('code_reflection_drafts')
        .insert({
          file_path: normalizedPath,
          original_code: fileContent,
          proposed_code: data.proposed_code || fileContent,
          reason: data.reason || "To improve code structure and readability"
        })
        .select()
        .single();
        
      if (draftError) {
        console.error("Error storing code draft:", draftError);
        return {
          success: false, 
          error: `Failed to save code draft: ${draftError.message}`
        };
      }
      
      // Set the current draft
      setCurrentDraft(draftData);
      
      return {
        success: true,
        draft: draftData,
        insight: data.insight || "Reflection complete"
      };
      
    } catch (error: any) {
      console.error("Code reflection error:", error);
      return { 
        success: false, 
        error: `Reflection process error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }, [fileSystem]);

  const applyChanges = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      // Retrieve the draft from the database
      const { data: draft, error: draftError } = await supabase
        .from('code_reflection_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (draftError) {
        console.error("Error fetching code draft:", draftError);
        return false;
      }

      if (!draft) {
        console.error("Draft not found with ID:", draftId);
        return false;
      }

      // Get the file - properly access the fileSystem
      const fileEntry = fileSystem.getFileByPath(draft.file_path);

      if (!fileEntry) {
        console.error(`File not found: ${draft.file_path}`);
        return false;
      }

      // Update the file content in the database
      const { error: updateError } = await supabase
        .from('files')
        .update({ content: draft.proposed_code })
        .eq('id', fileEntry.id);

      if (updateError) {
        console.error("Error updating file content:", updateError);
        return false;
      }

      // Refresh the file system to reflect the changes
      await fileSystem.refreshFiles();

      // Clear the current draft
      setCurrentDraft(null);

      return true;
    } catch (error) {
      console.error("Error applying code changes:", error);
      return false;
    }
  }, [fileSystem]);

  const discardDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      // Delete the draft from the database
      const { error } = await supabase
        .from('code_reflection_drafts')
        .delete()
        .eq('id', draftId);

      if (error) {
        console.error("Error deleting code draft:", error);
        return false;
      }

      // Clear the current draft
      setCurrentDraft(null);

      return true;
    } catch (error) {
      console.error("Error discarding code draft:", error);
      return false;
    }
  }, []);

  return {
    reflectOnCode,
    applyChanges,
    discardDraft,
    currentDraft
  };
};
