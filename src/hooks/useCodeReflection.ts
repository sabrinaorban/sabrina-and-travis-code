import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

    try {
      // Get the folder
      const normalizedPath = normalizePath(folderPath);
      console.log(`Looking for folder with normalized path: ${normalizedPath}`);
      
      // Debug info to help troubleshoot
      console.log('Available root files:', 
        fileSystem.fileSystem.files.map(f => `${f.path} (${f.type})`).join(', '));
      
      // Find the folder node
      const findFolder = (files: any[], path: string): any => {
        // If path is empty or root, return all files
        if (!path || path === '/') {
          return { type: 'folder', children: files };
        }
        
        // Split path into parts
        const parts = path.split('/').filter(Boolean);
        let current = { type: 'folder', children: files };
        
        // Navigate down the path
        for (const part of parts) {
          if (!current.children) {
            return null;
          }
          
          const found = current.children.find((f: any) => 
            f.name.toLowerCase() === part.toLowerCase() && f.type === 'folder'
          );
          
          if (!found) {
            return null;
          }
          
          current = found;
        }
        
        return current;
      };
      
      const folder = findFolder(fileSystem.fileSystem.files, normalizedPath);
      
      if (!folder || folder.type !== 'folder') {
        console.error(`Folder not found or not a folder: ${normalizedPath}`);
        console.log('File system structure:', JSON.stringify(getFileTreeDebugInfo(fileSystem.fileSystem.files), null, 2));
        return [];
      }
      
      console.log(`Found folder with ${folder.children?.length || 0} children`);
      
      // Collect all code files from the folder
      if (folder.children) {
        collectFiles(folder.children, normalizedPath);
      }
      
      console.log(`Found ${codeFiles.length} code files in ${folderPath} within token budget`);
      return codeFiles;
    } catch (error) {
      console.error(`Error collecting files from folder ${folderPath}:`, error);
      return [];
    }
  }, [fileSystem]);

  /**
   * Determine if a path is a folder
   */
  const isFolder = useCallback((path: string): boolean => {
    try {
      const normalizedPath = normalizePath(path);
      console.log(`Checking if path is a folder: ${normalizedPath}`);
      
      // Handle root path special case
      if (normalizedPath === '' || normalizedPath === '/') {
        return true;
      }
      
      // Check if this is a direct match for a folder in the file system
      const directMatch = fileSystem.getFileByPath(normalizedPath);
      if (directMatch) {
        return directMatch.type === 'folder';
      }
      
      // Alternative approach for nested folders
      const findFolderByPath = (files: any[], searchPath: string): any => {
        if (!searchPath || searchPath === '/') {
          return { type: 'folder', children: files };
        }
        
        // Split path into parts
        const parts = searchPath.split('/').filter(Boolean);
        let current = { type: 'folder', children: files };
        
        // Navigate down the path
        for (const part of parts) {
          if (!current.children) {
            return null;
          }
          
          const found = current.children.find((f: any) => 
            f.name.toLowerCase() === part.toLowerCase()
          );
          
          if (!found) {
            return null;
          }
          
          current = found;
        }
        
        return current;
      };
      
      const folderNode = findFolderByPath(fileSystem.fileSystem.files, normalizedPath);
      return folderNode?.type === 'folder';
      
    } catch (error) {
      console.error(`Error checking if path is a folder: ${path}`, error);
      return false;
    }
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
      console.log("Normalized path:", normalizedPath);
      
      // Debug log the file system structure
      console.log("Available files/folders at root level:", 
        fileSystem.fileSystem.files.map(f => `${f.name} (${f.type})`).join(', '));
      
      // First check if the path exists and whether it's a file or folder
      const isPathAFolder = await isFolder(normalizedPath);
      console.log(`Path ${normalizedPath} is a folder: ${isPathAFolder}`);
      
      if (isPathAFolder) {
        // Handle folder reflection
        return await reflectOnFolder(normalizedPath);
      } else {
        // Check if a file exists at this path
        const fileEntry = fileSystem.getFileByPath(normalizedPath);
        
        if (fileEntry && fileEntry.type === 'file') {
          // Handle file reflection
          return await reflectOnFile(normalizedPath);
        } else {
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
      }
    } catch (error: any) {
      console.error("Code reflection error:", error);
      return { 
        success: false, 
        error: `Reflection process error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }, [fileSystem, isFolder]);

  /**
   * Process reflection for a single file
   */
  const reflectOnFile = useCallback(async (filePath: string): Promise<CodeReflectionResult> => {
    console.log("Looking for file with normalized path:", filePath);
      
    // Debug log to show available files
    console.log("Available files in fileSystem:", 
      fileSystem.fileSystem.files.map(f => f.path).join(', '));
    
    // Get file directly or traverse path to find it
    const getFileContent = (path: string): string | null => {
      // Try direct access first
      const fileEntry = fileSystem.getFileByPath(path);
      if (fileEntry && fileEntry.content) {
        return fileEntry.content;
      }
      
      // If not found, try to traverse the path manually
      const parts = path.split('/').filter(Boolean);
      if (parts.length === 0) return null;
      
      let current = fileSystem.fileSystem.files;
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        // Find the entry at this level
        const entry = current.find((e: any) => e.name === part);
        if (!entry) {
          console.log(`Part "${part}" not found in path ${currentPath}`);
          return null;
        }
        
        if (isLastPart && entry.type === 'file') {
          return entry.content;
        }
        
        if (!isLastPart && entry.type === 'folder' && entry.children) {
          current = entry.children;
        } else if (!isLastPart) {
          console.log(`Part "${part}" is not a folder or has no children`);
          return null;
        }
      }
      
      return null;
    };
    
    const fileContent = getFileContent(filePath);
    
    if (!fileContent) {
      console.error(`File has no content or doesn't exist: ${filePath}`);
      
      // Find similar files for suggestions
      const similarFiles = findSimilarFiles(filePath, fileSystem.fileSystem.files);
      let errorMessage = `File not found at path: ${filePath}`;
      
      // Add suggestions if any were found
      if (similarFiles.length > 0) {
        errorMessage += "\n\nDid you mean one of these files?";
        const suggestions = similarFiles.slice(0, 5).map(file => `- ${file.path} (${file.type})`).join("\n");
        errorMessage += `\n${suggestions}`;
      }
      
      return { 
        success: false, 
        error: errorMessage
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
