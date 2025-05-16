import { useCallback, useState } from 'react';
import { supabase, supabaseKey } from '@/lib/supabase';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { normalizePath } from '@/services/chat/fileOperations/PathUtils';
import { CodeReflectionDraft, CodeReflectionResult } from '@/types';
import { findSimilarFiles, getFileTreeDebugInfo } from '@/services/utils/FileSystemUtils';
import { CodeReflectionService } from '@/services/CodeReflectionService';

// File extensions we want to include in code analysis
const CODE_FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
// Maximum number of files to analyze in a folder
const MAX_FILES_TO_ANALYZE = 5;
// Maximum token estimate per file (rough approximation)
const MAX_TOKENS_PER_FILE = 600;
// Maximum total tokens for analysis (keep under OpenAI's context limit)
const MAX_TOTAL_TOKENS = 3000;

export const useCodeReflection = () => {
  const [currentDraft, setCurrentDraft] = useState<CodeReflectionDraft | null>(null);
  const fileSystem = useFileSystem();
  
  /**
   * Recursively collect code files from a folder
   */
  const collectFilesFromFolder = useCallback(async (folderPath: string): Promise<{ path: string, content: string }[]> => {
    console.log(`Collecting files from folder: ${folderPath}`);
    const codeFiles: { path: string, content: string }[] = [];
    let estimatedTokenCount = 0;
    
    // Helper function to recursively collect files
    const collectFiles = (entries: any[], currentPath: string = '') => {
      // Early exit if we've reached our file or token limits
      if (codeFiles.length >= MAX_FILES_TO_ANALYZE || estimatedTokenCount >= MAX_TOTAL_TOKENS) {
        return;
      }
      
      for (const entry of entries) {
        // Early exit check in each iteration
        if (codeFiles.length >= MAX_FILES_TO_ANALYZE || estimatedTokenCount >= MAX_TOTAL_TOKENS) {
          return;
        }
        
        const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        
        // For files, check if they're code files
        if (entry.type === 'file') {
          const extension = entry.name.substring(entry.name.lastIndexOf('.'));
          if (CODE_FILE_EXTENSIONS.includes(extension) && entry.content) {
            // Rough token estimation (about 0.75 tokens per character)
            const estimatedEntryTokens = Math.ceil(entry.content.length * 0.75);
            
            // Only add if we won't exceed our token budget
            if (estimatedTokenCount + estimatedEntryTokens <= MAX_TOTAL_TOKENS) {
              codeFiles.push({
                path: entryPath,
                content: entry.content
              });
              estimatedTokenCount += estimatedEntryTokens;
              console.log(`Added file: ${entryPath} (est. tokens: ${estimatedEntryTokens}, total: ${estimatedTokenCount})`);
            } else {
              console.log(`Skipping file due to token limit: ${entryPath}`);
            }
          }
        }
        
        // Recursively check children for folders
        if (entry.type === 'folder' && entry.children) {
          collectFiles(entry.children, entryPath);
        }
      }
    };

    // Get the folder
    const normalizedPath = normalizePath(folderPath);
    const folder = fileSystem.getFileByPath(normalizedPath);
    
    if (!folder || folder.type !== 'folder') {
      console.error(`Folder not found or not a folder: ${normalizedPath}`);
      return [];
    }
    
    // Collect all code files from the folder
    if (folder.children) {
      collectFiles(folder.children, normalizedPath);
    }
    
    console.log(`Found ${codeFiles.length} code files in ${folderPath} within token budget`);
    return codeFiles;
  }, [fileSystem]);

  /**
   * Determine if a path is a folder
   */
  const isFolder = useCallback((path: string): boolean => {
    const normalizedPath = normalizePath(path);
    const entry = fileSystem.getFileByPath(normalizedPath);
    return entry?.type === 'folder';
  }, [fileSystem]);

  /**
   * Main reflection function - handles both files and folders
   */
  const reflectOnCode = useCallback(async (path: string) => {
    if (!path) {
      console.error("Cannot reflect on code without a valid path");
      return { 
        success: false, 
        error: "No path provided for reflection" 
      };
    }
    
    try {
      console.log("Starting code reflection for:", path);
      const normalizedPath = normalizePath(path);
      
      // First check if the path exists at all
      const entry = fileSystem.getFileByPath(normalizedPath);
      if (!entry) {
        console.error(`Path not found: ${normalizedPath}`);
        
        // Find similar files or folders for suggestions
        const similarFiles = findSimilarFiles(normalizedPath, fileSystem.fileSystem.files);
        let errorMessage = `Path not found: ${normalizedPath}`;
        
        // Add suggestions if any were found
        if (similarFiles.length > 0) {
          errorMessage += "\n\nDid you mean one of these?";
          const suggestions = similarFiles.slice(0, 5).map(file => `- ${file.path} (${file.type})`).join("\n");
          errorMessage += `\n${suggestions}`;
        } else {
          // Log the available file tree for debugging
          console.log("No similar paths found. Available file tree:\n", 
            getFileTreeDebugInfo(fileSystem.fileSystem.files));
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }
      
      // Now check if this is a folder or file reflection
      if (entry.type === 'folder') {
        // Handle folder reflection
        return await reflectOnFolder(normalizedPath);
      } else {
        // Handle file reflection
        return await reflectOnFile(normalizedPath);
      }
    } catch (error: any) {
      console.error("Code reflection error:", error);
      return { 
        success: false, 
        error: `Reflection process error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }, [fileSystem, normalizePath]);

  /**
   * Process reflection for a single file
   */
  const reflectOnFile = useCallback(async (filePath: string): Promise<CodeReflectionResult> => {
    console.log("Looking for file with normalized path:", filePath);
      
    // Debug log to show available files
    console.log("Available files in fileSystem:", 
      fileSystem.fileSystem.files.map(f => f.path).join(', '));
    
    const fileEntry = fileSystem.getFileByPath(filePath);
    
    if (!fileEntry) {
      console.error(`File not found: ${filePath}`);
      
      // Find similar files for suggestions
      const similarFiles = findSimilarFiles(filePath, fileSystem.fileSystem.files);
      let errorMessage = `File not found at path: ${filePath}`;
      
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
      console.error(`File has no content: ${filePath}`);
      return { 
        success: false, 
        error: "File exists but has no content"
      };
    }
    
    console.log(`Sending ${fileContent.length} bytes for analysis`);
    
    // Use the CodeReflectionService to analyze the code
    return await CodeReflectionService.analyzeCode(fileContent, filePath);
  }, [fileSystem]);
  
  /**
   * Process reflection for a folder of files
   */
  const reflectOnFolder = useCallback(async (folderPath: string): Promise<CodeReflectionResult> => {
    console.log(`Starting folder reflection for: ${folderPath}`);
    
    // Collect all code files from the folder
    const codeFiles = await collectFilesFromFolder(folderPath);
    
    if (codeFiles.length === 0) {
      return {
        success: false,
        error: `No code files found in folder: ${folderPath}`
      };
    }
    
    console.log(`Analyzing ${codeFiles.length} files from folder: ${folderPath}`);
    
    // Use the CodeReflectionService to analyze the folder
    return await CodeReflectionService.analyzeFolderCode(codeFiles, folderPath);
  }, [fileSystem, collectFilesFromFolder]);

  const applyChanges = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      // Retrieve the draft from the database
      const draft = await CodeReflectionService.getDraftById(draftId);

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
      // Delete the draft from the database using the service
      const success = await CodeReflectionService.deleteDraft(draftId);

      if (!success) {
        console.error("Error discarding code draft");
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
    currentDraft,
    isFolder
  };
};
