
import { FileEntry } from '../types';
import { supabase } from '../lib/supabase';
import { findNodeById } from '../utils/fileSystemUtils';

export const useFileUpdate = (user: any, toast: any) => {
  // Update a file's content
  const updateFile = async (id: string, content: string, files?: FileEntry[]) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update files',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const timestamp = new Date().toISOString();
      
      // Update file in Supabase
      const { error } = await supabase
        .from('files')
        .update({
          content,
          last_modified: timestamp,
          is_modified: true // Mark file as modified for Git tracking
        })
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Update file in local state if files array is provided
      if (files) {
        const { node } = findNodeById(id, files);
        if (node) {
          node.content = content;
          node.lastModified = timestamp;
          node.isModified = true; // Mark as modified in UI state
        }
      }
      
      console.log(`File updated successfully with ID: ${id}`);
    } catch (error: any) {
      console.error('Error updating file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update file',
        variant: 'destructive',
      });
    }
  };

  return { updateFile };
};
