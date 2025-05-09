
// Normalize and clean a file path
export const normalizePath = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedPath.replace(/\/+$/, '');
};

// Extract parent path and filename from a path
export const getPathParts = (path: string): { parentPath: string; fileName: string } => {
  const cleanPath = normalizePath(path);
  const pathParts = cleanPath.split('/').filter(Boolean);
  const fileName = pathParts.pop() || '';
  const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
  
  return { parentPath, fileName };
};
