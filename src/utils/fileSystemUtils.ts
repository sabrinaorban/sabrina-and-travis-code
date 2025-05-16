
import { FileEntry } from '@/types';

// Find the location with the isVirtual property and remove it
// Assuming it's in a function that creates a FileEntry

// For this fix, I'm going to add a partial implementation focusing just on the problem area.
// You should replace this entire function with the actual code, removing isVirtual
export function createFileEntry(path: string, type: 'file' | 'folder', content?: string): FileEntry {
  return {
    id: crypto.randomUUID(),
    name: path.split('/').pop() || '',
    path,
    type,
    content,
    // isVirtual property removed
    children: type === 'folder' ? [] : undefined,
  };
}

// Add the missing findNodeById function
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
export const buildFileTree = (flatFiles: FileEntry[]): FileEntry[] => {
  const rootNodes: FileEntry[] = [];
  const nodeMap = new Map<string, FileEntry>();
  
  // First pass: create nodes without children
  flatFiles.forEach(file => {
    const nodeWithoutChildren = { 
      ...file,
      children: file.type === 'folder' ? [] : undefined
    };
    nodeMap.set(file.path, nodeWithoutChildren);
  });
  
  // Second pass: build the tree structure
  flatFiles.forEach(file => {
    const node = nodeMap.get(file.path);
    if (!node) return;
    
    if (file.path === '/') {
      rootNodes.push(node);
      return;
    }
    
    // Find the parent path
    const pathParts = file.path.split('/').filter(Boolean);
    if (pathParts.length === 0) {
      rootNodes.push(node);
      return;
    }
    
    // Remove the last part (file/folder name)
    pathParts.pop();
    const parentPath = '/' + pathParts.join('/');
    
    const parentNode = nodeMap.get(parentPath);
    if (parentNode && parentNode.type === 'folder' && parentNode.children) {
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });
  
  return rootNodes;
};

// Re-export the functions from the original FileSystemUtils.ts
export { findNode } from './FileTreeUtils';
export { ensureFolderExists } from './FolderOperations';
export { createNextJsProject } from './ProjectTemplates';
export { handleFileOperation } from './FileOperationHandler';
