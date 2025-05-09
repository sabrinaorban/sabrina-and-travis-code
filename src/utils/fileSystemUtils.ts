
import { FileEntry } from '../types';

// Helper to find a node in the file tree
export const findNode = (
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
export const findNodeById = (
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

// Add the missing buildFileTree function
export const buildFileTree = (files: FileEntry[]): FileEntry[] => {
  const rootFiles: FileEntry[] = [];
  const pathMap: Record<string, FileEntry> = {};
  
  // First pass: create all entries
  files.forEach(file => {
    // Create a copy of the file to avoid mutating the original
    const entry: FileEntry = {
      ...file,
      children: file.type === 'folder' ? [] : undefined,
      parent: null
    };
    
    pathMap[file.path] = entry;
  });
  
  // Second pass: build the tree structure
  Object.values(pathMap).forEach(file => {
    // Skip the root node
    if (file.path === '/') {
      rootFiles.push(file);
      return;
    }
    
    const pathParts = file.path.split('/').filter(Boolean);
    
    // Handle files/folders in the root directory
    if (pathParts.length === 1) {
      rootFiles.push(file);
      return;
    }
    
    // Get parent path for non-root items
    const parentPath = '/' + pathParts.slice(0, pathParts.length - 1).join('/');
    const parent = pathMap[parentPath];
    
    if (parent && parent.type === 'folder') {
      parent.children = parent.children || [];
      parent.children.push(file);
      file.parent = parent;
    } else {
      // If parent doesn't exist, add to root
      rootFiles.push(file);
    }
  });
  
  return rootFiles;
};
