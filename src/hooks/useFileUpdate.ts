
// Import the correct findNodeById function
import { findNodeById } from '../utils/fileSystemUtils';
import { FileEntry } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useFileUpdate = (user: any, toast: ReturnType<typeof useToast>['toast']) => {
  // Update file content by ID
  const updateFile = async (id: string, content: string, files: FileEntry[]): Promise<void> => {
    try {
      // Find the file in the file system
      const { node: file } = findNodeById(id, files);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Update in database with last_modified and is_modified flags
      const { error } = await supabase
        .from('files')
        .update({
          content,
          last_modified: new Date().toISOString(),
          is_modified: true
        })
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Success',
        description: `${file.name} updated successfully`,
      });
    } catch (error: any) {
      console.error('Error updating file:', error);
      
      toast({
        title: 'Error',
        description: `Failed to update file: ${error.message}`,
        variant: 'destructive',
      });
      
      throw error;
    }
  };

  return {
    updateFile
  };
};
