
// Normalize and clean a file path
export const normalizePath = (path: string): string => {
  // Remove leading slash for consistency with FileSystem component expectations
  let normalizedPath = path || '';
  
  // Handle empty or null paths
  if (!normalizedPath) return '';
  
  // Trim whitespace
  normalizedPath = normalizedPath.trim();
  
  // Remove leading slash for consistency
  normalizedPath = normalizedPath.startsWith('/') ? normalizedPath.substring(1) : normalizedPath;
  
  // Remove trailing slashes
  normalizedPath = normalizedPath.replace(/\/+$/, '');
  
  // Log for debugging
  console.log(`Normalized path: "${path}" -> "${normalizedPath}"`);
  
  return normalizedPath;
};

// Extract parent path and filename from a path
export const getPathParts = (path: string): { parentPath: string; fileName: string } => {
  const cleanPath = normalizePath(path);
  const pathParts = cleanPath.split('/').filter(Boolean);
  const fileName = pathParts.pop() || '';
  const parentPath = pathParts.length === 0 ? '' : pathParts.join('/');
  
  return { parentPath, fileName };
};

// Check if a path exists in the file system
export const fileExists = (fileSystem: any, path: string): boolean => {
  try {
    if (!fileSystem || !path) return false;
    
    const normalizedPath = normalizePath(path);
    return fileSystem.getFileByPath(normalizedPath) !== null;
  } catch (error) {
    console.error(`Error checking if file exists at path ${path}:`, error);
    return false;
  }
};

// Check if a folder exists in the file system
export const folderExists = (fileSystem: any, path: string): boolean => {
  try {
    if (!fileSystem) return false;
    
    // Root folder always exists
    if (!path || path === '/' || normalizePath(path) === '') return true;
    
    const normalizedPath = normalizePath(path);
    const node = findNodeByPath(fileSystem.files, normalizedPath);
    
    return node !== null && node.type === 'folder';
  } catch (error) {
    console.error(`Error checking if folder exists at path ${path}:`, error);
    return false;
  }
};

// Get similar paths for suggestions when a path is not found
export const getSimilarPaths = (fileSystem: any, path: string, maxResults: number = 5): string[] => {
  try {
    if (!fileSystem || !path) return [];
    
    const normalizedPath = normalizePath(path);
    
    // Extract directory part to look in that area
    const pathParts = normalizedPath.split('/');
    pathParts.pop(); // Remove the last part (which might be incorrect)
    const basePath = pathParts.join('/');
    
    // Get all entries in the parent directory or root
    let entries: any[] = fileSystem.files;
    if (basePath) {
      const parentNode = findNodeByPath(fileSystem.files, basePath);
      if (parentNode && parentNode.children) {
        entries = parentNode.children;
      }
    }
    
    // Filter and sort by similarity (very simple implementation)
    const results = entries
      .map((entry: any) => ({
        name: entry.name,
        path: basePath ? `${basePath}/${entry.name}` : entry.name,
        type: entry.type,
        // Simple similarity - percentage of characters matching
        similarity: getSimilarityScore(normalizedPath, entry.name)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
      
    return results.map(r => r.path);
  } catch (error) {
    console.error(`Error finding similar paths for ${path}:`, error);
    return [];
  }
};

// Simple similarity score between strings (higher is more similar)
const getSimilarityScore = (target: string, candidate: string): number => {
  const targetLower = target.toLowerCase();
  const candidateLower = candidate.toLowerCase();
  
  // Check if one is a substring of the other
  if (targetLower.includes(candidateLower)) return 0.8;
  if (candidateLower.includes(targetLower)) return 0.7;
  
  // Count matching characters
  let matches = 0;
  const minLength = Math.min(targetLower.length, candidateLower.length);
  
  for (let i = 0; i < minLength; i++) {
    if (targetLower[i] === candidateLower[i]) {
      matches++;
    }
  }
  
  return matches / Math.max(targetLower.length, candidateLower.length);
};

// Recursively search for a file or folder in the file system
export const findNodeByPath = (files: any[], path: string): any => {
  if (!path || path === '/' || path === '') {
    return { type: 'folder', children: files };
  }
  
  const parts = normalizePath(path).split('/').filter(Boolean);
  let current: any = { type: 'folder', children: files };
  
  for (const part of parts) {
    if (!current?.children) {
      console.log(`No children found in current node while searching for ${part} in path ${path}`);
      return null;
    }
    
    const found = current.children.find((f: any) => 
      f.name.toLowerCase() === part.toLowerCase()
    );
    
    if (!found) {
      console.log(`Part "${part}" not found in path ${path}`);
      return null;
    }
    
    current = found;
  }
  
  return current;
};
