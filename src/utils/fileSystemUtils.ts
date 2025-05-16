
/**
 * Utility functions for file system operations
 */

import { FileEntry } from "@/types";

/**
 * Checks if a file exists in the file system
 */
export const fileExists = (filePath: string, files: FileEntry[]): boolean => {
  if (!filePath || !files?.length) return false;
  
  // Clean the path
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  
  // Traverse the file tree to find the file
  const pathParts = cleanPath.split('/').filter(Boolean);
  let currentNode: FileEntry | undefined = undefined;
  
  // Start with root entries
  const rootEntries = files;
  
  // If it's a root file
  if (pathParts.length === 1) {
    return rootEntries.some(entry => entry.name === pathParts[0]);
  }
  
  // Navigate through directories
  let currentEntries = rootEntries;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const dirName = pathParts[i];
    const dir = currentEntries.find(entry => entry.name === dirName && entry.type === 'folder');
    
    if (!dir || !dir.children) {
      return false; // Directory doesn't exist or has no children
    }
    
    currentEntries = dir.children;
  }
  
  // Check if file exists in the final directory
  const fileName = pathParts[pathParts.length - 1];
  return currentEntries.some(entry => entry.name === fileName);
}

/**
 * Get a file by its path from the file system
 */
export const getFileByPath = (filePath: string, files: FileEntry[]): FileEntry | null => {
  if (!filePath || !files?.length) return null;
  
  // Clean the path
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  
  // Split the path into parts
  const pathParts = cleanPath.split('/').filter(Boolean);
  
  // Start with root entries
  let currentEntries = files;
  
  // Navigate to the containing directory
  for (let i = 0; i < pathParts.length - 1; i++) {
    const dirName = pathParts[i];
    const dir = currentEntries.find(entry => entry.name === dirName && entry.type === 'folder');
    
    if (!dir || !dir.children) {
      return null; // Directory doesn't exist or has no children
    }
    
    currentEntries = dir.children;
  }
  
  // Find the file in the final directory
  const fileName = pathParts[pathParts.length - 1];
  return currentEntries.find(entry => entry.name === fileName) || null;
}

/**
 * Helper to find a node by ID in the file tree
 */
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

/**
 * Build a file tree from a flat list of files
 */
export const buildFileTree = (files: FileEntry[]): FileEntry[] => {
  const rootEntries: FileEntry[] = [];
  const pathMap: Record<string, FileEntry> = {};
  
  // Sort files by path length to process parent directories first
  const sortedFiles = [...files].sort((a, b) => 
    (a.path.split('/').length - b.path.split('/').length) || 
    a.path.localeCompare(b.path)
  );
  
  for (const file of sortedFiles) {
    // Handle root files/folders
    if (!file.path || file.path === '/' || file.path === file.name) {
      rootEntries.push(file);
      continue;
    }
    
    // Get parent path
    const pathParts = file.path.split('/').filter(Boolean);
    const fileName = pathParts.pop() || '';
    const parentPath = pathParts.length ? '/' + pathParts.join('/') : '/';
    
    if (parentPath === '/') {
      // Add to root if parent is root
      rootEntries.push(file);
    } else {
      // Find parent and add as child
      const parent = pathMap[parentPath];
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(file);
      } else {
        // Fallback if parent not found (should not happen with sorted files)
        rootEntries.push(file);
      }
    }
    
    // Add to path map for children to find
    pathMap[file.path] = file;
  }
  
  return rootEntries;
};

/**
 * Find files that match a partial path (for suggestions)
 * Returns matching files with their full paths
 */
export const findSimilarFiles = (partialPath: string, files: FileEntry[]): {path: string, type: string}[] => {
  if (!partialPath || !files?.length) return [];
  
  const cleanPath = partialPath.toLowerCase().startsWith('/') ? 
    partialPath.substring(1).toLowerCase() : 
    partialPath.toLowerCase();
  
  const results: {path: string, type: string}[] = [];
  
  // Helper function to search through a file tree
  const searchFiles = (entries: FileEntry[], currentPath: string = '') => {
    for (const entry of entries) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      
      // Check if this entry's path contains the search string
      if (entryPath.toLowerCase().includes(cleanPath)) {
        results.push({ 
          path: entryPath,
          type: entry.type
        });
      }
      
      // Recursively search in folders
      if (entry.type === 'folder' && entry.children) {
        searchFiles(entry.children, entryPath);
      }
    }
  };
  
  searchFiles(files);
  
  // Sort results by relevance - exact matches first, then by path length
  return results.sort((a, b) => {
    const aIsExact = a.path.toLowerCase() === cleanPath;
    const bIsExact = b.path.toLowerCase() === cleanPath;
    
    if (aIsExact && !bIsExact) return -1;
    if (!aIsExact && bIsExact) return 1;
    
    return a.path.length - b.path.length;
  });
};

/**
 * Debug helper to print the available files structure
 */
export const getFileTreeDebugInfo = (files: FileEntry[]): string => {
  const output: string[] = [];
  
  const printTree = (entries: FileEntry[], indent: string = '') => {
    for (const entry of entries) {
      output.push(`${indent}${entry.name} (${entry.type}) - Path: ${entry.path}`);
      
      if (entry.type === 'folder' && entry.children) {
        printTree(entry.children, `${indent}  `);
      }
    }
  };
  
  printTree(files);
  return output.join('\n');
};
