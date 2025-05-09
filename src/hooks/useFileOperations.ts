
import { useState } from 'react';
import { FileEntry } from '../types';
import { supabase, generateUUID } from '../lib/supabase';
import { useToast } from './use-toast';
import { findNode, findNodeById } from '../utils/fileSystemUtils';

export const useFileOperations = (user: any, refreshFiles: () => Promise<void>) => {
  const { toast } = useToast();
  
  // Find file by path
  const getFileByPath = (path: string, files: FileEntry[]): FileEntry | null => {
    const { node } = findNode(path, files);
    return node;
  };

  // Create a new file
  const createFile = async (path: string, name: string, content: string = '', files: FileEntry[]) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create files',
        variant: 'destructive',
      });
      return;
    }
    
    const { node } = findNode(path, files);
    
    if (!node || node.type !== 'folder') {
      toast({
        title: 'Error',
        description: `Cannot create file. Path ${path} does not exist or is not a folder.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Check if file with same name already exists
    if (node.children?.some(child => child.name === name)) {
      toast({
        title: 'Error',
        description: `A file or folder named '${name}' already exists at this location.`,
        variant: 'destructive',
      });
      return;
    }
    
    const filePath = `${path === '/' ? '' : path}/${name}`;
    const fileId = generateUUID();
    
    try {
      console.log('Creating file with ID:', fileId);
      
      // Create file in Supabase
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
      
      // Refresh files after creation
      await refreshFiles();
      
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

  // Create a new folder
  const createFolder = async (path: string, name: string, files: FileEntry[]) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create folders',
        variant: 'destructive',
      });
      return;
    }
    
    const { node } = findNode(path, files);
    
    if (!node || node.type !== 'folder') {
      toast({
        title: 'Error',
        description: `Cannot create folder. Path ${path} does not exist or is not a folder.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Check if folder with same name already exists
    if (node.children?.some(child => child.name === name)) {
      toast({
        title: 'Error',
        description: `A file or folder named '${name}' already exists at this location.`,
        variant: 'destructive',
      });
      return;
    }
    
    const folderPath = `${path === '/' ? '' : path}/${name}`;
    const folderId = generateUUID();
    
    try {
      console.log('Creating folder with ID:', folderId);
      
      // Create folder in Supabase
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
      
      // Refresh files after creation
      await refreshFiles();
      
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

  // Update a file's content
  const updateFile = async (id: string, content: string, files: FileEntry[], setFileSystem: any) => {
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
      
      // Update local state
      setFileSystem(prev => {
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
    
    const { parent, node, index } = findNodeById(id, files);
    
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

  return {
    getFileByPath,
    createFile,
    createFolder,
    updateFile,
    deleteFile
  };
};
