
import { FileEntry } from '../../types';

// Helper to find a node in the file tree
export const findNode = (
  path: string,
  nodes: FileEntry[]
): { parent: FileEntry | null; node: FileEntry | null } => {
  // Root path case
  if (path === '/') {
    return { parent: null, node: { id: 'root', name: 'root', path: '/', type: 'folder', children: nodes } };
  }

  // Split the path to get parent path and name
  const parts = path.split('/').filter(p => p);
  
  let currentNodes = nodes;
  let parent: FileEntry | null = null;
  let current: FileEntry | null = null;
  
  // Navigate the tree to find the path
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const part = parts[i];
    
    current = currentNodes.find(node => node.name === part) || null;
    
    if (!current) return { parent: null, node: null };
    
    if (isLast) {
      return { parent, node: current };
    }
    
    if (current.type !== 'folder' || !current.children) {
      return { parent: null, node: null };
    }
    
    parent = current;
    currentNodes = current.children;
  }
  
  return { parent, node: current };
};

// Helper to find a node by ID
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

// Enhanced implementation of ensuring a folder exists, creating parent folders as needed
export const ensureFolderExists = async (fileSystem: any, folderPath: string): Promise<void> => {
  if (!fileSystem || !fileSystem.createFolder) {
    console.error('[FileSystemUtils] Invalid fileSystem object or missing createFolder method');
    return;
  }
  
  if (folderPath === '/' || folderPath === '') {
    console.log('[FileSystemUtils] Root folder already exists, nothing to do');
    return;
  }
  
  // Clean up the path (remove trailing slashes)
  const cleanPath = folderPath.replace(/\/+$/, '');
  console.log(`[FileSystemUtils] Ensuring folder exists: ${cleanPath}`);
  
  // Check if folder exists
  const folder = fileSystem.getFileByPath ? fileSystem.getFileByPath(cleanPath) : null;
  if (folder) {
    console.log(`[FileSystemUtils] Folder already exists: ${cleanPath}`);
    return;
  }
  
  console.log(`[FileSystemUtils] Creating folder structure for: ${cleanPath}`);
  
  // Need to create folder - ensure parent folders exist first
  const segments = cleanPath.split('/').filter(Boolean);
  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const nextPath = currentPath === '' ? `/${segment}` : `${currentPath}/${segment}`;
    const existingFolder = fileSystem.getFileByPath ? fileSystem.getFileByPath(nextPath) : null;
    
    if (!existingFolder) {
      // Create this folder - path is parent, name is segment
      const parentPath = currentPath === '' ? '/' : currentPath;
      console.log(`[FileSystemUtils] Creating folder ${segment} at ${parentPath}`);
      
      try {
        await fileSystem.createFolder(parentPath, segment);
        console.log(`[FileSystemUtils] Created folder ${segment} at ${parentPath}`);
      } catch (error) {
        console.error(`[FileSystemUtils] Error creating folder ${segment} at ${parentPath}:`, error);
      }
    } else {
      console.log(`[FileSystemUtils] Folder already exists: ${nextPath}`);
    }
    
    currentPath = nextPath;
  }
  
  // Refresh files to update the UI
  if (fileSystem.refreshFiles) {
    console.log(`[FileSystemUtils] Refreshing files after folder creation`);
    await fileSystem.refreshFiles();
  }
};

// Create a test Next.js project
export const createNextJsProject = async (fileSystem: any): Promise<boolean> => {
  if (!fileSystem) {
    console.error('[FileSystemUtils] File system not available');
    return false;
  }
  
  try {
    console.log('[FileSystemUtils] Creating Next.js project structure');
    
    // Create main project folder
    await ensureFolderExists(fileSystem, '/nextjs-app');
    
    // Create basic structure folders
    await ensureFolderExists(fileSystem, '/nextjs-app/pages');
    await ensureFolderExists(fileSystem, '/nextjs-app/public');
    await ensureFolderExists(fileSystem, '/nextjs-app/styles');
    
    // Create package.json
    const packageJson = `{
  "name": "nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^12.0.0",
    "react": "^17.0.2",
    "react-dom": "^17.0.2"
  }
}`;
    
    await fileSystem.createFile('/nextjs-app', 'package.json', packageJson);
    
    // Create next.config.js
    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig`;
    
    await fileSystem.createFile('/nextjs-app', 'next.config.js', nextConfig);
    
    // Create index.js in pages folder
    const indexJs = `export default function Home() {
  return (
    <div>
      <h1>Hello</h1>
    </div>
  );
}`;
    
    await fileSystem.createFile('/nextjs-app/pages', 'index.js', indexJs);
    
    // Create global CSS file
    const globalCss = `html,
body {
  padding: 0;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

* {
  box-sizing: border-box;
}`;
    
    await fileSystem.createFile('/nextjs-app/styles', 'globals.css', globalCss);
    
    console.log('[FileSystemUtils] Next.js project created successfully');
    return true;
    
  } catch (error) {
    console.error('[FileSystemUtils] Error creating Next.js project:', error);
    return false;
  }
};
