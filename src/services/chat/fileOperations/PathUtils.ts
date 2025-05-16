
// Normalize and clean a file path
export const normalizePath = (path: string): string => {
  // Remove leading slash for consistency with FileSystem component expectations
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  return normalizedPath.replace(/\/+$/, '');
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
    const normalizedPath = normalizePath(path);
    return fileSystem.getFileByPath(normalizedPath) !== null;
  } catch (error) {
    console.error(`Error checking if file exists at path ${path}:`, error);
    return false;
  }
};
