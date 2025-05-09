
import { FileEntry } from '../types';
import { supabase, generateUUID } from '../lib/supabase';
import { findNode } from '../services/utils/FileTreeUtils';

export const useCreateFile = (user: any, refreshFiles: () => Promise<void>, toast: any) => {
  // Create a new file
  const createFile = async (path: string, name: string, content: string = '', files?: FileEntry[]) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create files',
        variant: 'destructive',
      });
      return;
    }
    
    const filesArray = files || [];
    
    // For root path
    const parentPath = path === '/' ? '' : path;
    const filePath = `${parentPath}/${name}`;
    console.log(`Creating file at path: ${filePath}`);
    
    try {
      // Check if parent folder exists
      const { node } = findNode(path, filesArray);
      
      if (!node || node.type !== 'folder') {
        console.log(`Parent folder not found at path: ${path}, creating it...`);
        // Create parent folders recursively
        const pathParts = path.split('/').filter(Boolean);
        let currentPath = '';
        
        for (const part of pathParts) {
          const nextPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
          const { node: existingFolder } = findNode(nextPath, filesArray);
          
          if (!existingFolder) {
            const folderParentPath = currentPath || '/';
            console.log(`Creating parent folder: ${part} at ${folderParentPath}`);
            
            const folderId = generateUUID();
            const { error } = await supabase
              .from('files')
              .insert({
                id: folderId,
                user_id: user.id,
                name: part,
                path: nextPath,
                type: 'folder',
                content: null,
                last_modified: new Date().toISOString(),
              });
              
            if (error) throw error;
          }
          
          currentPath = nextPath;
        }
        
        // Refresh files to get the newly created folders
        await refreshFiles();
      }
      
      // Now create the file
      const fileId = generateUUID();
      console.log('Creating file with ID:', fileId);
      
      const { error } = await supabase
        .from('files')
        .insert({
          id: fileId,
          user_id: user.id,
          name,
          path: filePath,
          type: 'file',
          content,
          last_modified: new Date().toISOString(),
        });
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Success',
        description: `File '${name}' created successfully.`,
      });
    } catch (error: any) {
      console.error('Error creating file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create file',
        variant: 'destructive',
      });
    }
  };

  return { createFile };
};
