
import React, { useState, useEffect } from 'react';
import { ChatHistory } from '@/components/ChatHistory';
import { ChatInput } from '@/components/ChatInput';
import { FileExplorer } from '@/components/FileExplorer';
import { CodeEditor } from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { ChatProvider } from '@/contexts/ChatContext';
import { FileSystemProvider } from '@/contexts/FileSystemContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Menu, X, Upload, Download, Trash, RefreshCw } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [showFiles, setShowFiles] = useState(true);
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  
  const handleLogout = async () => {
    await logout();
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
  };
  
  // Effect for debugging auth state
  useEffect(() => {
    console.log('Dashboard render - auth state:', { user, authLoading });
  }, [user, authLoading]);
  
  if (authLoading) {
    return (
      <div className="flex flex-col h-screen justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-travis mb-4" />
        <p className="text-gray-500">Loading your workspace...</p>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <ChatProvider>
      <FileSystemProvider>
        <div className="flex flex-col h-screen">
          {/* Header */}
          <header className="bg-white border-b py-3 px-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowFiles(!showFiles)}
              >
                <Menu size={20} />
              </Button>
              <h1 className="text-xl font-bold text-travis">Travis AI Assistant</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-medium">Welcome, {user.name}</span>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
          </header>
          
          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Files Panel */}
            {showFiles && (
              <div className="w-64 flex-shrink-0 flex flex-col">
                <div className="flex justify-between items-center p-2 bg-gray-50 border-b">
                  <h3 className="font-medium">Files</h3>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsFileUploadOpen(true)}
                      title="Upload file"
                    >
                      <Upload size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Refresh files"
                    >
                      <RefreshCw size={16} />
                    </Button>
                  </div>
                </div>
                <FileExplorer />
              </div>
            )}
            
            {/* Center Panel - Code Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <CodeEditor />
            </div>
            
            {/* Right Panel - Chat */}
            <div className="w-96 flex-shrink-0 flex flex-col border-l">
              <ChatHistory />
              <ChatInput />
            </div>
          </div>
        </div>
      </FileSystemProvider>
    </ChatProvider>
  );
};

export default Dashboard;
