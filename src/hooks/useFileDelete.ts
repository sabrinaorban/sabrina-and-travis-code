
import { FileEntry } from '../types';
import { supabase } from '../lib/supabase';
import { findNodeById } from '../utils/fileSystemUtils';

export const useFileDelete = (user: any, refreshFiles: () => Promise<void>, toast: any) => {
  // Delete a file or folder
  const deleteFile = async (id: string, files: FileEntry[]) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete files',
        variant: 'destructive',
      });
      return Promise.reject(new Error('Not logged in'));
    }
    
    const { node } = findNodeById(id, files);
    
    if (!node) {
      toast({
        title: 'Error',
        description: 'Cannot delete. File or folder not found.',
        variant: 'destructive',
      });
      return Promise.reject(new Error('File not found'));
    }
    
    try {
      // Delete file from Supabase
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) {
        throw error;
      }
      
      // If it's a folder, delete all children recursively
      if (node.type === 'folder') {
        const { error: childrenError } = await supabase
          .from('files')
          .delete()
          .like('path', `${node.path}/%`)
          .eq('user_id', user.id);
          
        if (childrenError) {
          throw childrenError;
        }
      }
      
      // Refresh files after deletion
      await refreshFiles();
      
      return Promise.resolve();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete file',
        variant: 'destructive',
      });
      return Promise.reject(error);
    }
  };

  return { deleteFile };
};
