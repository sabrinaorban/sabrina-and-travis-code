
// Re-export all utility functions from their respective files
export { findNode } from './FileTreeUtils';
export { findNodeById } from './FileTreeUtils'; 
export { ensureFolderExists } from './FolderOperations';
export { createNextJsProject } from './ProjectTemplates';
export { handleFileOperation } from './FileOperationHandler';

// Export functions from the fileSystemUtils file directly instead of importing from self
export const buildFileTree = (files: any[]): any[] => {
  // Implementation moved from src/utils/fileSystemUtils.ts
  const rootEntries: any[] = [];
  const pathMap: Record<string, any> = {};
  
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

export const findSimilarFiles = (partialPath: string, files: any[]): {path: string, type: string}[] => {
  if (!partialPath || !files?.length) return [];
  
  const cleanPath = partialPath.toLowerCase().startsWith('/') ? 
    partialPath.substring(1).toLowerCase() : 
    partialPath.toLowerCase();
  
  const results: {path: string, type: string}[] = [];
  
  // Helper function to search through a file tree
  const searchFiles = (entries: any[], currentPath: string = '') => {
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

export const getFileTreeDebugInfo = (files: any[]): string => {
  const output: string[] = [];
  
  const printTree = (entries: any[], indent: string = '') => {
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
