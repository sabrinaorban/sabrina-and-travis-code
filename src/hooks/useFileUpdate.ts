
import { FileEntry } from '../types';
import { supabase } from '../lib/supabase';
import { findNodeById } from '../utils/fileSystemUtils';

export const useFileUpdate = (user: any, toast: any) => {
  // Update a file's content
  const updateFile = async (id: string, content: string, files: FileEntry[] = [], setFileSystem?: any) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update files',
        variant: 'destructive',
      });
      return;
    }
    
    const { node } = findNodeById(id, files);
    
    if (!node || node.type !== 'file') {
      toast({
        title: 'Error',
        description: 'Cannot update content. File not found or is not a file.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Update file in Supabase
      const { error } = await supabase
        .from('files')
        .update({
          content,
          last_modified: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) {
        throw error;
      }
      
      // Update local state if setFileSystem function is provided
      if (setFileSystem) {
        setFileSystem((prev: any) => {
          const newFiles = JSON.parse(JSON.stringify(prev.files));
          const { node: targetNode } = findNodeById(id, newFiles);
          
          if (targetNode) {
            targetNode.content = content;
            targetNode.lastModified = Date.now();
          }
          
          return {
            ...prev,
            files: newFiles,
            selectedFile: prev.selectedFile?.id === id 
              ? { ...prev.selectedFile, content, lastModified: Date.now() } 
              : prev.selectedFile
          };
        });
      }
      
      toast({
        title: 'Success',
        description: `File '${node.name}' updated successfully.`,
      });
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
