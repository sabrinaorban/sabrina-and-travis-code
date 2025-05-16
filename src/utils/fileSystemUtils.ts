
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
