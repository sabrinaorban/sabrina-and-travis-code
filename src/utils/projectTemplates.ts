
// Project templates for quick project creation

export const nextJsTemplate = {
  files: [
    {
      operation: 'create',
      path: '/nextjs-app',
      content: null
    },
    {
      operation: 'create',
      path: '/nextjs-app/pages',
      content: null
    },
    {
      operation: 'create',
      path: '/nextjs-app/styles',
      content: null
    },
    {
      operation: 'create',
      path: '/nextjs-app/public',
      content: null
    },
    {
      operation: 'create',
      path: '/nextjs-app/components',
      content: null
    },
    {
      operation: 'create',
      path: '/nextjs-app/pages/index.js',
      content: `
export default function Home() {
  return (
    <div className="container">
      <main>
        <h1 className="title">Hello</h1>
      </main>

      <style jsx>{
        \`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
          text-align: center;
        }
        \`
      }</style>
    </div>
  );
}
`
    },
    {
      operation: 'create',
      path: '/nextjs-app/package.json',
      content: `{
  "name": "nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^12.3.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
`
    },
    {
      operation: 'create',
      path: '/nextjs-app/next.config.js',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
`
    }
  ]
};
