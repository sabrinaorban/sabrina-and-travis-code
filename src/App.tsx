
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FileSystemProvider } from './contexts/FileSystemContext';
import { Toaster } from './components/ui/toaster';
import Index from './pages/Index';
import { ThemeProvider } from './contexts/ThemeContext';
import { GitHubProvider } from './contexts/GitHubContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            {/* Important: FileSystemProvider must be before GitHubProvider since GitHub uses FileSystem */}
            <FileSystemProvider>
              <GitHubProvider>
                <Router>
                  <Routes>
                    <Route path="/" element={<Index />} />
                  </Routes>
                </Router>
                <Toaster />
              </GitHubProvider>
            </FileSystemProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
