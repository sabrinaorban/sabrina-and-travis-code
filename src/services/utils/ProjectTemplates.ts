
import { ensureFolderExists } from './FolderOperations';

// Create a test Next.js project
export const createNextJsProject = async (fileSystem: any): Promise<boolean> => {
  if (!fileSystem) {
    console.error('[ProjectTemplates] File system not available');
    return false;
  }
  
  try {
    console.log('[ProjectTemplates] Creating Next.js project structure');
    
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
    
    console.log('[ProjectTemplates] Next.js project created successfully');
    return true;
    
  } catch (error) {
    console.error('[ProjectTemplates] Error creating Next.js project:', error);
    return false;
  }
};
