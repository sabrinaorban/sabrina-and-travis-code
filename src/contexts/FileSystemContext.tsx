
import React, { createContext, useState, useContext } from 'react';
import { FileEntry, FileSystemState } from '../types';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';

interface FileSystemContextType {
  fileSystem: FileSystemState;
  createFile: (path: string, name: string, content?: string) => void;
  createFolder: (path: string, name: string) => void;
  updateFile: (id: string, content: string) => void;
  deleteFile: (id: string) => void;
  selectFile: (file: FileEntry | null) => void;
  getFileByPath: (path: string) => FileEntry | null;
}

// Initial file system
const initialFiles: FileEntry[] = [
  {
    id: nanoid(),
    name: 'Project',
    path: '/',
    type: 'folder',
    children: [
      {
        id: nanoid(),
        name: 'src',
        path: '/src',
        type: 'folder',
        children: [
          {
            id: nanoid(),
            name: 'index.js',
            path: '/src/index.js',
            type: 'file',
            content: '// This is the main entry file\nconsole.log("Hello world!");',
            lastModified: Date.now()
          },
          {
            id: nanoid(),
            name: 'App.js',
            path: '/src/App.js',
            type: 'file',
            content: 'import React from "react";\n\nfunction App() {\n  return (\n    <div>\n      <h1>Hello Sabrina!</h1>\n    </div>\n  );\n}\n\nexport default App;',
            lastModified: Date.now()
          }
        ]
      },
      {
        id: nanoid(),
        name: 'README.md',
        path: '/README.md',
        type: 'file',
        content: '# Project Documentation\n\nThis is a sample project for Sabrina and Travis to collaborate on.',
        lastModified: Date.now()
      }
    ]
  }
];

const FileSystemContext = createContext<FileSystemContextType | null>(null);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fileSystem, setFileSystem] = useState<FileSystemState>({
    files: initialFiles,
    selectedFile: null
  });
  const { toast } = useToast();

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
  const createFile = (path: string, name: string, content: string = '') => {
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
    
    const newFile: FileEntry = {
      id: nanoid(),
      name,
      path: `${path === '/' ? '' : path}/${name}`,
      type: 'file',
      content,
      lastModified: Date.now()
    };
    
    setFileSystem(prev => {
      const newFiles = [...prev.files];
      const { node: targetNode } = findNode(path, newFiles);
      
      if (targetNode && targetNode.children) {
        targetNode.children = [...targetNode.children, newFile];
      }
      
      return {
        ...prev,
        files: newFiles
      };
    });
    
    toast({
      title: 'Success',
      description: `File '${name}' created successfully.`,
    });
  };

  // Create a new folder
  const createFolder = (path: string, name: string) => {
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
    
    const newFolder: FileEntry = {
      id: nanoid(),
      name,
      path: `${path === '/' ? '' : path}/${name}`,
      type: 'folder',
      children: [],
      lastModified: Date.now()
    };
    
    setFileSystem(prev => {
      const newFiles = [...prev.files];
      const { node: targetNode } = findNode(path, newFiles);
      
      if (targetNode && targetNode.children) {
        targetNode.children = [...targetNode.children, newFolder];
      }
      
      return {
        ...prev,
        files: newFiles
      };
    });
    
    toast({
      title: 'Success',
      description: `Folder '${name}' created successfully.`,
    });
  };

  // Update a file's content
  const updateFile = (id: string, content: string) => {
    const { node } = findNodeById(id, fileSystem.files);
    
    if (!node || node.type !== 'file') {
      toast({
        title: 'Error',
        description: 'Cannot update content. File not found or is not a file.',
        variant: 'destructive',
      });
      return;
    }
    
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
  };

  // Delete a file or folder
  const deleteFile = (id: string) => {
    const { parent, node, index } = findNodeById(id, fileSystem.files);
    
    if (!node) {
      toast({
        title: 'Error',
        description: 'Cannot delete. File or folder not found.',
        variant: 'destructive',
      });
      return;
    }
    
    setFileSystem(prev => {
      const newFiles = JSON.parse(JSON.stringify(prev.files));
      
      if (!parent) {
        // It's a root-level file/folder
        newFiles.splice(index, 1);
      } else {
        const { node: parentNode } = findNodeById(parent.id, newFiles);
        if (parentNode && parentNode.children) {
          parentNode.children = parentNode.children.filter(child => child.id !== id);
        }
      }
      
      return {
        ...prev,
        files: newFiles,
        selectedFile: prev.selectedFile?.id === id ? null : prev.selectedFile
      };
    });
    
    toast({
      title: 'Success',
      description: `'${node.name}' deleted successfully.`,
    });
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
        getFileByPath
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
