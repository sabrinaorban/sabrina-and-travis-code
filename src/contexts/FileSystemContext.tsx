import React, { createContext, useState, useContext, useEffect } from 'react';
import { FileEntry, FileSystemState } from '../types';
import { useToast } from '@/hooks/use-toast';
import { supabase, generateUUID } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FileSystemContextType {
  fileSystem: FileSystemState;
  createFile: (path: string, name: string, content?: string) => Promise<void>;
  createFolder: (path: string, name: string) => Promise<void>;
  updateFile: (id: string, content: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  selectFile: (file: FileEntry | null) => void;
  getFileByPath: (path: string) => FileEntry | null;
  isLoading: boolean;
  refreshFiles: () => Promise<void>;
}

const FileSystemContext = createContext<FileSystemContextType | null>(null);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fileSystem, setFileSystem] = useState<FileSystemState>({
    files: [],
    selectedFile: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load files from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      refreshFiles();
    }
  }, [user]);

  // Create a function to refresh files from the database
  const refreshFiles = async () => {
    if (!user) return Promise.resolve();
    
    setIsLoading(true);
    try {
      console.log('Fetching files for user:', user.id);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        throw error;
      }
      
      console.log('Fetched files:', data?.length || 0);
      
      if (data) {
        // Convert flat file list to hierarchical structure
        const fileEntries: FileEntry[] = [];
        const fileMap = new Map<string, FileEntry>();
        
        // First pass: create all file entries
        data.forEach(file => {
          const entry: FileEntry = {
            id: file.id,
            name: file.name,
            path: file.path,
            type: file.type as 'file' | 'folder',
            content: file.content || '',
            lastModified: new Date(file.last_modified).getTime()
          };
          
          if (entry.type === 'folder') {
            entry.children = [];
          }
          
          fileMap.set(entry.path, entry);
        });
        
        // Second pass: organize into hierarchy
        fileMap.forEach(entry => {
          const parentPath = entry.path.substring(0, entry.path.lastIndexOf('/'));
          
          if (parentPath) {
            const parent = fileMap.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(entry);
            } else if (parentPath === '/') {
              // Root-level entries
              fileEntries.push(entry);
            }
          } else {
            // Root-level entries
            fileEntries.push(entry);
          }
        });
        
        setFileSystem({
          files: fileEntries,
          selectedFile: null
        });
      }
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load files',
        variant: 'destructive',
      });
      
      // Initialize with empty file system on error
      setFileSystem({
        files: [],
        selectedFile: null
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
    return Promise.resolve();
  };

  // Helper to find a node in the file tree
  const findNode = (
    path: string,
    nodes: FileEntry[]
  ): { parent: FileEntry | null; node: FileEntry | null } => {
    // Root path case
    if (path === '/') {
      return { parent: null, node: { id: 'root', name: 'root', path: '/', type: 'folder', children: nodes } };
    }

    // Split the path to get parent path and name
    const parts = path.split('/').filter(p => p);
    
    let currentNodes = nodes;
    let parent: FileEntry | null = null;
    let current: FileEntry | null = null;
    
    // Navigate the tree to find the path
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const part = parts[i];
      
      current = currentNodes.find(node => node.name === part) || null;
      
      if (!current) return { parent: null, node: null };
      
      if (isLast) {
        return { parent, node: current };
      }
      
      if (current.type !== 'folder' || !current.children) {
        return { parent: null, node: null };
      }
      
      parent = current;
      currentNodes = current.children;
    }
    
    return { parent, node: current };
  };

  // Helper to find a node by ID
  const findNodeById = (
    id: string,
    nodes: FileEntry[]
  ): { parent: FileEntry | null; node: FileEntry | null; index: number } => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      if (node.id === id) {
        return { parent: null, node, index: i };
      }
      
      if (node.type === 'folder' && node.children) {
        const result = findNodeById(id, node.children);
        if (result.node) {
          return { ...result, parent: node };
        }
      }
    }
    
    return { parent: null, node: null, index: -1 };
  };

  // Find file by path
  const getFileByPath = (path: string): FileEntry | null => {
    const { node } = findNode(path, fileSystem.files);
    return node;
  };

  // Create a new file
  const createFile = async (path: string, name: string, content: string = '') => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create files',
        variant: 'destructive',
      });
      return;
    }
    
    const { node } = findNode(path, fileSystem.files);
    
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
  const createFolder = async (path: string, name: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create folders',
        variant: 'destructive',
      });
      return;
    }
    
    const { node } = findNode(path, fileSystem.files);
    
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
  const updateFile = async (id: string, content: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update files',
        variant: 'destructive',
      });
      return;
    }
    
    const { node } = findNodeById(id, fileSystem.files);
    
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
  const deleteFile = async (id: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete files',
        variant: 'destructive',
      });
      return Promise.reject(new Error('Not logged in'));
    }
    
    const { parent, node, index } = findNodeById(id, fileSystem.files);
    
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

  // Select a file for viewing/editing
  const selectFile = (file: FileEntry | null) => {
    setFileSystem(prev => ({
      ...prev,
      selectedFile: file
    }));
  };

  return (
    <FileSystemContext.Provider
      value={{
        fileSystem,
        createFile,
        createFolder,
        updateFile,
        deleteFile,
        selectFile,
        getFileByPath,
        isLoading,
        refreshFiles
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
};

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (context === null) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};
