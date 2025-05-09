import { FileEntry } from "../types";

// Function to build a file tree from a flat list of files
export const buildFileTree = (flatFiles: FileEntry[]): FileEntry[] => {
  // Create a map to store all files and folders
  const fileMap = new Map<string, FileEntry>();
  const rootItems: FileEntry[] = [];

  // First pass: create all file and folder entries
  flatFiles.forEach((file) => {
    // Clone the file to avoid mutation of the original
    const clonedFile = { ...file };
    
    if (file.type === 'folder') {
      clonedFile.children = [];
    }
    
    fileMap.set(file.path, clonedFile);
  });

  // Second pass: establish parent-child relationships
  flatFiles.forEach((file) => {
    const path = file.path;
    
    // Skip root items
    if (path.indexOf('/') === -1) {
      rootItems.push(fileMap.get(path)!);
      return;
    }
    
    // Get parent path
    const lastSlashIndex = path.lastIndexOf('/');
    const parentPath = lastSlashIndex > 0 ? path.substring(0, lastSlashIndex) : '/';
    
    const parent = fileMap.get(parentPath);
    const current = fileMap.get(path);
    
    if (parent && current) {
      // Create children array if it doesn't exist
      if (!parent.children) {
        parent.children = [];
      }
      
      // Add to parent's children
      parent.children.push(current);
    } else if (!parent && current) {
      // If parent doesn't exist but we have a path with slashes,
      // we need to create virtual parent folders
      const pathParts = path.split('/');
      let currentPath = '';
      
      // Iterate through path parts except the last one (which is the current item)
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!part) continue; // Skip empty parts
        
        const newPath = currentPath ? `${currentPath}/${part}` : part;
        
        // Create virtual folder if it doesn't exist
        if (!fileMap.has(newPath)) {
          const virtualFolder: FileEntry = {
            id: `virtual-${newPath}`,
            name: part,
            path: newPath,
            type: 'folder',
            children: [],
            isVirtual: true // Mark as virtual to handle differently if needed
          };
          
          fileMap.set(newPath, virtualFolder);
          
          // If this is a root virtual folder
          if (!currentPath) {
            rootItems.push(virtualFolder);
          } else {
            const parentFolder = fileMap.get(currentPath);
            if (parentFolder && parentFolder.children) {
              parentFolder.children.push(virtualFolder);
            }
          }
        }
        
        currentPath = newPath;
      }
      
      // Now add the current item to its parent
      const parentFolder = fileMap.get(currentPath);
      if (parentFolder && parentFolder.children) {
        parentFolder.children.push(current);
      }
    } else {
      // If neither parent nor current exists (should not happen)
      console.warn('Neither parent nor current file exists:', {parentPath, path});
    }
  });

  // If we have no root items but have files, something went wrong
  if (rootItems.length === 0 && flatFiles.length > 0) {
    console.warn('No root items found, but we have files. File structure might be incorrect.');
    
    // Return all files as root items as fallback
    return flatFiles.map(file => {
      const clone = { ...file };
      if (file.type === 'folder') {
        clone.children = [];
      }
      return clone;
    });
  }

  return rootItems;
};

// Function to find a file by path in the file tree
export const findFileByPath = (files: FileEntry[], targetPath: string): FileEntry | null => {
  for (const file of files) {
    if (file.path === targetPath) {
      return file;
    }
    
    if (file.type === 'folder' && file.children) {
      const found = findFileByPath(file.children, targetPath);
      if (found) return found;
    }
  }
  
  return null;
};

// Export the findNode and findNodeById functions from services/utils/FileSystemUtils.ts
export { findNode, findNodeById } from '../services/utils/FileSystemUtils';
