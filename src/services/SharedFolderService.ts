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
      if (!this.isPathWithinSharedFolder(filePath)) {
        return { 
          content: '', 
          success: false, 
          message: `Cannot read from outside the shared folder: ${this.getSharedFolderPath()}` 
        };
      }

      const normalizedPath = normalizePath(filePath);
      
      // Query the database for the specific file
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('path', normalizedPath)
        .maybeSingle();
      
      if (error) {
        console.error(`Error reading file ${normalizedPath}:`, error);
        return { content: '', success: false, message: `Error reading file: ${error.message}` };
      }
      
      if (!data) {
        return { content: '', success: false, message: `File not found: ${normalizedPath}` };
      }
      
      // Log this read operation in flamejournal
      await this.logSharedFolderOperation('read', normalizedPath, null);
      
      return { 
        content: data.content || '', 
        success: true, 
        message: `Successfully read file: ${normalizedPath}` 
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
    overwrite: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isPathWithinSharedFolder(filePath)) {
        return { 
          success: false, 
          message: `Cannot write outside the shared folder: ${this.getSharedFolderPath()}` 
        };
      }

      const normalizedPath = normalizePath(filePath);
      
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
        .select('id, user_id')
        .eq('path', normalizedPath)
        .maybeSingle();
      
      if (existingFile && !overwrite) {
        return { 
          success: false, 
          message: `File already exists: ${normalizedPath}. Use overwrite flag to replace it.` 
        };
      }
      
      if (existingFile) {
        // Update existing file
        const { error } = await supabase
          .from('files')
          .update({ 
            content, 
            updated_at: new Date().toISOString(),
            // Keep the original user_id if it exists, otherwise use current user_id
            user_id: existingFile.user_id || user_id
          })
          .eq('id', existingFile.id);
        
        if (error) {
          console.error(`Error updating file ${normalizedPath}:`, error);
          return { success: false, message: `Error updating file: ${error.message}` };
        }
        
        // Log this operation in flamejournal
        await this.logSharedFolderOperation('update', normalizedPath, content);
        
        return { success: true, message: `File updated: ${normalizedPath}` };
      } else {
        // Get file name and directory from path
        const pathParts = normalizedPath.split('/');
        const fileName = pathParts.pop() || '';
        const directory = pathParts.join('/');
        
        // Create new file with the user_id
        const { error } = await supabase
          .from('files')
          .insert({
            path: normalizedPath,
            name: fileName,
            type: 'file',
            content,
            user_id, // Include the user_id in the insert
            parent_path: directory || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        
        if (error) {
          console.error(`Error creating file ${normalizedPath}:`, error);
          return { success: false, message: `Error creating file: ${error.message}` };
        }
        
        // Log this operation in flamejournal
        await this.logSharedFolderOperation('create', normalizedPath, content);
        
        return { success: true, message: `File created: ${normalizedPath}` };
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
   * Log file operations to flamejournal for traceability
   */
  async logSharedFolderOperation(
    operationType: 'read' | 'create' | 'update' | 'delete', 
    filePath: string, 
    content: string | null
  ): Promise<boolean> {
    try {
      // Get the current user session to include the user_id in the metadata
      const { data: sessionData } = await supabase.auth.getSession();
      const user_id = sessionData?.session?.user?.id;
      
      // Create a journal entry about this operation
      const { error } = await supabase
        .from('flamejournal')
        .insert({
          content: `Travis ${operationType === 'read' ? 'read from' : 'wrote to'} the shared folder: ${filePath}`,
          entry_type: 'shared_folder_access',
          tags: ['shared_folder', operationType, 'file_operation'],
          metadata: {
            operation: operationType,
            path: filePath,
            timestamp: new Date().toISOString(),
            hasContent: !!content,
            user_id: user_id || 'anonymous' // Include the user_id in the metadata for auditing
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
