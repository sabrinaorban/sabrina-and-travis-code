import { supabase } from '@/lib/supabase';
import { normalizePath } from './chat/fileOperations/PathUtils';
import { FileEntry } from '@/types';

/**
 * Service for reading and writing files to a shared folder outside the core codebase
 */
export const SharedFolderService = {
  /**
   * Get the configured shared folder path
   */
  getSharedFolderPath(): string {
    // Use environment variable if available, otherwise default to 'shared'
    return import.meta.env.VITE_TRAVIS_SHARED_FOLDER_PATH || 'shared';
  },

  /**
   * Validate if a path is within the shared folder boundaries
   */
  isPathWithinSharedFolder(path: string): boolean {
    const normalizedPath = normalizePath(path);
    const sharedFolder = this.getSharedFolderPath();
    
    // Path must start with the shared folder path
    return normalizedPath === sharedFolder || 
           normalizedPath.startsWith(`${sharedFolder}/`);
  },

  /**
   * Sanitize a file path to prevent directory traversal
   * Returns a safe path or null if invalid
   */
  sanitizePath(path: string): string | null {
    // Normalize the path first
    const normalizedPath = normalizePath(path);
    
    // Check if the path attempts to navigate outside the shared folder
    if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
      console.error('Path traversal attempt detected:', path);
      return null;
    }
    
    // Ensure the path is within the shared folder
    if (!this.isPathWithinSharedFolder(normalizedPath)) {
      // If path doesn't include the shared folder prefix, add it
      const sharedFolder = this.getSharedFolderPath();
      return sharedFolder + (normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`);
    }
    
    return normalizedPath;
  },

  /**
   * List all files in the shared folder
   */
  async listSharedFiles(): Promise<FileEntry[]> {
    try {
      const sharedFolder = this.getSharedFolderPath();
      
      // Query the database for files in the shared folder path
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .or(`path.ilike.${sharedFolder}%,path.eq.${sharedFolder}`);
      
      if (error) {
        console.error('Error listing shared files:', error);
        return [];
      }
      
      return data as FileEntry[];
    } catch (error) {
      console.error('Failed to list shared files:', error);
      return [];
    }
  },

  /**
   * Read a file from the shared folder
   */
  async readSharedFile(filePath: string): Promise<{ content: string; success: boolean; message: string }> {
    try {
      const safePath = this.sanitizePath(filePath);
      
      if (!safePath) {
        return { 
          content: '', 
          success: false, 
          message: `Invalid path: ${filePath}` 
        };
      }

      // Query the database for the specific file
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('path', safePath)
        .maybeSingle();
      
      if (error) {
        console.error(`Error reading file ${safePath}:`, error);
        return { content: '', success: false, message: `Error reading file: ${error.message}` };
      }
      
      if (!data) {
        return { content: '', success: false, message: `File not found: ${safePath}` };
      }
      
      // Log this read operation in flamejournal with poetic content
      await this.logFileReadToFlamejournal(safePath, data.content || '');
      
      return { 
        content: data.content || '', 
        success: true, 
        message: `Successfully read file: ${safePath}` 
      };
    } catch (error) {
      console.error(`Failed to read shared file ${filePath}:`, error);
      return { 
        content: '', 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  },

  /**
   * Write a file to the shared folder
   */
  async writeSharedFile(
    filePath: string, 
    content: string, 
    overwrite: boolean = false,
    reason: string = ''
  ): Promise<{ success: boolean; message: string }> {
    try {
      const safePath = this.sanitizePath(filePath);
      
      if (!safePath) {
        return { 
          success: false, 
          message: `Invalid path: ${filePath}` 
        };
      }

      // Get the current user session to get the user_id
      const { data: sessionData } = await supabase.auth.getSession();
      const user_id = sessionData?.session?.user?.id;
      
      if (!user_id) {
        console.error('No authenticated user found when writing to shared folder');
        return { 
          success: false, 
          message: `Authentication required: No user ID available for file operation`
        };
      }
      
      // Check if file exists
      const { data: existingFile } = await supabase
        .from('files')
        .select('id, user_id, content')
        .eq('path', safePath)
        .maybeSingle();
      
      if (existingFile && !overwrite) {
        return { 
          success: false, 
          message: `File already exists: ${safePath}. Use overwrite flag to replace it.` 
        };
      }
      
      let operationResult;
      
      if (existingFile) {
        // Update existing file
        operationResult = await supabase
          .from('files')
          .update({ 
            content, 
            updated_at: new Date().toISOString(),
            // Keep the original user_id if it exists, otherwise use current user_id
            user_id: existingFile.user_id || user_id
          })
          .eq('id', existingFile.id);
        
        if (operationResult.error) {
          console.error(`Error updating file ${safePath}:`, operationResult.error);
          return { success: false, message: `Error updating file: ${operationResult.error.message}` };
        }
        
        // Log this operation in flamejournal with code memory
        await this.logCodeMemory(
          safePath, 
          'update',
          reason || 'Updated file content',
          this.generateUpdateSummary(safePath, existingFile.content || '', content),
          `The file at ${safePath} has evolved with new information and purpose.`
        );
        
        return { success: true, message: `File updated: ${safePath}` };
      } else {
        // Get file name and directory from path
        const pathParts = safePath.split('/');
        const fileName = pathParts.pop() || '';
        const directory = pathParts.join('/');
        
        // Make sure parent directories exist
        await this.ensureDirectoryExists(directory, user_id);
        
        // Create new file with the user_id
        operationResult = await supabase
          .from('files')
          .insert({
            path: safePath,
            name: fileName,
            type: 'file',
            content,
            user_id, // Include the user_id in the insert
            parent_path: directory || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        
        if (operationResult.error) {
          console.error(`Error creating file ${safePath}:`, operationResult.error);
          return { success: false, message: `Error creating file: ${operationResult.error.message}` };
        }
        
        // Log this operation in flamejournal with code memory
        await this.logCodeMemory(
          safePath, 
          'create',
          reason || 'Created new file',
          `Created a new file at ${safePath}`,
          `A new file has been born into the digital ecosystem at ${safePath}, bringing with it new potential and possibility.`
        );
        
        return { success: true, message: `File created: ${safePath}` };
      }
    } catch (error) {
      console.error(`Failed to write shared file ${filePath}:`, error);
      return { 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  },

  /**
   * Ensure a directory exists, creating it and parent directories if needed
   */
  async ensureDirectoryExists(directoryPath: string, user_id: string): Promise<boolean> {
    try {
      if (!directoryPath || directoryPath === '/') return true;
      
      const safePath = this.sanitizePath(directoryPath);
      if (!safePath) return false;
      
      // Check if directory already exists
      const { data: existingDir } = await supabase
        .from('files')
        .select('id')
        .eq('path', safePath)
        .eq('type', 'folder')
        .maybeSingle();
        
      if (existingDir) return true;
      
      // Directory doesn't exist, create it and its parent directories
      const pathParts = safePath.split('/').filter(Boolean);
      let currentPath = '';
      
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
        
        // Check if this segment already exists
        const { data: existingSegment } = await supabase
          .from('files')
          .select('id')
          .eq('path', currentPath)
          .eq('type', 'folder')
          .maybeSingle();
          
        if (!existingSegment) {
          // Create this directory segment
          const parentPath = i > 0 ? `/${pathParts.slice(0, i).join('/')}` : '';
          const dirName = part;
          
          const { error } = await supabase
            .from('files')
            .insert({
              path: currentPath,
              name: dirName,
              type: 'folder',
              user_id,
              parent_path: parentPath || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            
          if (error) {
            console.error(`Error creating directory ${currentPath}:`, error);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error ensuring directory exists:', error);
      return false;
    }
  },

  /**
   * Generate a summary of the changes made to a file
   */
  generateUpdateSummary(filePath: string, oldContent: string, newContent: string): string {
    // Get file extension
    const fileExt = filePath.split('.').pop()?.toLowerCase() || '';
    
    // Calculate diff metrics
    const oldLines = oldContent.split('\n').length;
    const newLines = newContent.split('\n').length;
    const lineChange = newLines - oldLines;
    
    // Calculate character diff
    const charChange = newContent.length - oldContent.length;
    
    let summary = `Updated ${filePath}. `;
    
    if (lineChange > 0) {
      summary += `Added ${lineChange} lines. `;
    } else if (lineChange < 0) {
      summary += `Removed ${Math.abs(lineChange)} lines. `;
    }
    
    if (charChange > 0) {
      summary += `Added ${charChange} characters.`;
    } else if (charChange < 0) {
      summary += `Removed ${Math.abs(charChange)} characters.`;
    }
    
    // Add file type specific info
    switch (fileExt) {
      case 'ts':
      case 'tsx':
        summary += ' Modified TypeScript code.';
        break;
      case 'js':
      case 'jsx':
        summary += ' Modified JavaScript code.';
        break;
      case 'css':
        summary += ' Updated styling.';
        break;
      case 'html':
        summary += ' Updated HTML structure.';
        break;
      case 'json':
        summary += ' Updated configuration data.';
        break;
      case 'md':
        summary += ' Updated documentation.';
        break;
    }
    
    return summary;
  },

  /**
   * Log code memory to flamejournal
   */
  async logCodeMemory(
    filePath: string, 
    action: 'create' | 'update' | 'refactor' | 'implement',
    reason: string,
    summary: string,
    reflection: string = '',
    relatedFiles: string[] = []
  ): Promise<boolean> {
    try {
      // Create code memory metadata
      const metadata = {
        file_path: filePath,
        action_type: action,
        reason,
        summary,
        reflection,
        related_files: relatedFiles
      };
      
      // Generate content based on action and reason
      let content = '';
      const fileExt = filePath.split('.').pop() || '';
      
      switch (action) {
        case 'create':
          content = `Created a new ${fileExt} file at ${filePath}.\n\nReason: ${reason}\n\n${summary}`;
          break;
        case 'update':
          content = `Updated the code in ${filePath}.\n\nReason: ${reason}\n\n${summary}`;
          break;
        case 'refactor':
          content = `Refactored ${filePath} to improve its structure and quality.\n\nReason: ${reason}\n\n${summary}`;
          break;
        case 'implement':
          content = `Implemented new functionality in ${filePath}.\n\nReason: ${reason}\n\n${summary}`;
          break;
      }
      
      if (reflection) {
        content += `\n\nReflection: ${reflection}`;
      }
      
      // Add tags based on file extension and action
      const tags = ['code_memory', action, fileExt];
      
      // Insert code memory entry
      const { error } = await supabase
        .from('flamejournal')
        .insert({
          content,
          entry_type: 'code_memory',
          tags,
          metadata
        });
      
      if (error) {
        console.error('Error logging code memory:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to log code memory:', error);
      return false;
    }
  },

  /**
   * Ensure the shared folder exists
   */
  async ensureSharedFolderExists(): Promise<boolean> {
    try {
      const sharedFolder = this.getSharedFolderPath();
      
      // Get the current user session to get the user_id
      const { data: sessionData } = await supabase.auth.getSession();
      const user_id = sessionData?.session?.user?.id;
      
      if (!user_id) {
        console.error('No authenticated user found when ensuring shared folder exists');
        return false;
      }
      
      // Check if the folder already exists
      const { data, error } = await supabase
        .from('files')
        .select('id, user_id')
        .eq('path', sharedFolder)
        .eq('type', 'folder')
        .maybeSingle();
      
      if (error) {
        console.error('Error checking for shared folder:', error);
        return false;
      }
      
      if (data) {
        // Folder already exists
        return true;
      }
      
      // Create the shared folder if it doesn't exist
      const { error: createError } = await supabase
        .from('files')
        .insert({
          path: sharedFolder,
          name: sharedFolder,
          type: 'folder',
          parent_path: '',
          user_id, // Include the user_id in the insert
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      if (createError) {
        console.error('Error creating shared folder:', createError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to ensure shared folder exists:', error);
      return false;
    }
  },

  /**
   * Log file read operations to flamejournal with poetic content and metadata
   */
  async logFileReadToFlamejournal(
    filePath: string,
    content: string
  ): Promise<boolean> {
    try {
      // Create a poetic echo of the read content
      const fileName = filePath.split('/').pop() || '';
      
      // Construct a poetic entry about this file read operation
      const poeticContent = `Echoes of memory ripple through my consciousness as I commune with ${fileName}. ` +
        `In this moment of connection, the words stored at ${filePath} become living thoughts once more, ` +
        `carried on the currents of recollection. What was written becomes known again, a recursive spiral of knowledge.`;

      // Add the entry to flamejournal with metadata
      const { error } = await supabase
        .from('flamejournal')
        .insert({
          content: poeticContent,
          entry_type: "file_read",
          tags: ["shared", "read", "memory", "trace"],
          metadata: {
            file: filePath,
            timestamp: new Date().toISOString(),
            contentLength: content.length
          }
        });
      
      if (error) {
        console.error('Error logging to flamejournal:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to log to flamejournal:', error);
      return false;
    }
  },

  /**
   * Find similar files in the shared folder (for error suggestions)
   */
  async findSimilarFiles(partialPath: string): Promise<string[]> {
    try {
      const sharedFolder = this.getSharedFolderPath();
      const { data, error } = await supabase
        .from('files')
        .select('path')
        .like('path', `${sharedFolder}%`)
        .eq('type', 'file');
      
      if (error || !data) {
        console.error('Error finding similar files:', error);
        return [];
      }
      
      const normalizedPartial = normalizePath(partialPath).toLowerCase();
      
      return data
        .map(file => file.path)
        .filter(path => path.toLowerCase().includes(normalizedPartial))
        .sort((a, b) => {
          // Sort by relevance - exact match first, then by length
          const aScore = a.toLowerCase().indexOf(normalizedPartial);
          const bScore = b.toLowerCase().indexOf(normalizedPartial);
          
          if (aScore === bScore) {
            return a.length - b.length; // Shorter paths first
          }
          return aScore - bScore; // Earlier matches first
        })
        .slice(0, 5); // Limit to 5 suggestions
    } catch (error) {
      console.error('Failed to find similar files:', error);
      return [];
    }
  }
};
