
// Import the correct findNodeById function
import { findNodeById } from '../utils/fileSystemUtils';
import { FileEntry } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from './use-toast';

export const useFileDelete = (user: any, refreshFiles: () => Promise<void>, toast: ReturnType<typeof useToast>['toast']) => {
  // Delete a file by ID
  const deleteFile = async (id: string, files: FileEntry[]): Promise<void> => {
    try {
      // Find the file in the file system
      const { node: file } = findNodeById(id, files);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Delete from database
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      // Refresh files list
      await refreshFiles();
      
      // Show success message
      toast({
        title: 'Success',
        description: `${file.name} deleted successfully`,
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      
      toast({
        title: 'Error',
        description: `Failed to delete file: ${error.message}`,
        variant: 'destructive',
      });
      
      throw error;
    }
  };

  return {
    deleteFile
  };
};
