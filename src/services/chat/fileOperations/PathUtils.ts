
// Normalize and clean a file path
export const normalizePath = (path: string): string => {
  // Remove leading slash for consistency with FileSystem component expectations
  let normalizedPath = path || '';
  
  // Handle empty or null paths
  if (!normalizedPath) return '';
  
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

// Recursively search for a file or folder in the file system
export const findNodeByPath = (files: any[], path: string): any => {
  if (!path || path === '/' || path === '') {
    return { type: 'folder', children: files };
  }
  
  const parts = path.split('/').filter(Boolean);
  let current: any = { type: 'folder', children: files };
  
  for (const part of parts) {
    if (!current?.children) {
      return null;
    }
    
    const found = current.children.find((f: any) => 
      f.name.toLowerCase() === part.toLowerCase()
    );
    
    if (!found) {
      return null;
    }
    
    current = found;
  }
  
  return current;
};
