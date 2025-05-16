
import { FileEntry } from '@/types';

// Create a file entry with normalized path
export function createFileEntry(path: string, type: 'file' | 'folder', content?: string): FileEntry {
  // Normalize the path for consistency
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  return {
    id: crypto.randomUUID(),
    name: normalizedPath.split('/').pop() || '',
    path: normalizedPath,
    type,
    content,
    children: type === 'folder' ? [] : undefined,
  };
}

// Find node by ID with improved path handling
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

// Build file tree with improved path handling
export const buildFileTree = (flatFiles: FileEntry[]): FileEntry[] => {
  const rootNodes: FileEntry[] = [];
  const nodeMap = new Map<string, FileEntry>();
  
  // First pass: create nodes without children
  flatFiles.forEach(file => {
    // Normalize paths to be consistent
    const normalizedPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
    
    const nodeWithoutChildren = { 
      ...file,
      path: normalizedPath,
      children: file.type === 'folder' ? [] : undefined
    };
    nodeMap.set(normalizedPath, nodeWithoutChildren);
  });
  
  // Second pass: build the tree structure
  flatFiles.forEach(file => {
    const normalizedPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
    const node = nodeMap.get(normalizedPath);
    if (!node) return;
    
    if (normalizedPath === '' || normalizedPath === '/') {
      rootNodes.push(node);
      return;
    }
    
    // Find the parent path
    const pathParts = normalizedPath.split('/').filter(Boolean);
    if (pathParts.length === 0) {
      rootNodes.push(node);
      return;
    }
    
    // Remove the last part (file/folder name)
    pathParts.pop();
    const parentPath = pathParts.length > 0 ? pathParts.join('/') : '';
    
    const parentNode = nodeMap.get(parentPath);
    if (parentNode && parentNode.type === 'folder' && parentNode.children) {
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });
  
  return rootNodes;
};

// Re-export the functions from the correct paths
export { findNode } from '../services/utils/FileTreeUtils';
export { ensureFolderExists } from '../services/utils/FolderOperations';
export { createNextJsProject } from '../services/utils/ProjectTemplates';
export { handleFileOperation } from '../services/utils/FileOperationHandler';
