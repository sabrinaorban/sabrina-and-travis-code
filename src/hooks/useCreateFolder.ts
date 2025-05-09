
import { FileEntry } from '../types';
import { supabase, generateUUID } from '../lib/supabase';
import { findNode } from '../utils/fileSystemUtils';

export const useCreateFolder = (user: any, refreshFiles: () => Promise<void>, toast: any) => {
  // Create a new folder
  const createFolder = async (path: string, name: string, files?: FileEntry[]) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create folders',
        variant: 'destructive',
      });
      return;
    }
    
    const filesArray = files || [];
    
    // For root path
    const parentPath = path === '/' ? '' : path;
    const folderPath = `${parentPath}/${name}`;
    console.log(`Creating folder at path: ${folderPath}`);
    
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
      
      // Check if folder with same name already exists
      const { node: parentNode } = findNode(path, filesArray);
      if (parentNode && parentNode.children?.some(child => child.name === name)) {
        toast({
          title: 'Error',
          description: `A file or folder named '${name}' already exists at this location.`,
          variant: 'destructive',
        });
        return;
      }
      
      // Now create the folder
      const folderId = generateUUID();
      console.log('Creating folder with ID:', folderId);
      
      const { error } = await supabase
        .from('files')
        .insert({
          id: folderId,
          user_id: user.id,
          name,
          path: folderPath,
          type: 'folder',
          content: null,
          last_modified: new Date().toISOString(),
        });
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Success',
        description: `Folder '${name}' created successfully.`,
      });
    } catch (error: any) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  return { createFolder };
};
