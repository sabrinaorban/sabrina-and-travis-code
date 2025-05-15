import React, { useState, useEffect } from 'react';
import { ChatHistory } from '@/components/ChatHistory';
import { ChatInput } from '@/components/ChatInput';
import { FileExplorer } from '@/components/FileExplorer';
import { CodeEditor } from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ChatProvider } from '@/contexts/ChatContext';
import { FileSystemProvider, useFileSystem } from '@/contexts/FileSystemContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GitHubAuth } from '@/components/GitHubAuth';
import { GitHubRepoSelector } from '@/components/GitHubRepoSelector';
import { GitHubProvider, useGitHub } from '@/contexts/github';
import { GitHubCommitPanelContainer } from '@/components/github/commit/GitHubCommitPanelContainer';
import { ReflectionButton } from '@/components/ReflectionButton';
import { 
  Loader2, Menu, FolderPlus, FilePlus, Github, RefreshCw
} from 'lucide-react';

// Component to handle file creation
const FileSystemCreateFile = ({ fileName, path, onSuccess }) => {
  const { createFile } = useFileSystem();
  const { toast } = useToast();
  
  const handleCreateFile = async () => {
    if (!fileName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a file name",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await createFile(path, fileName, '');
      onSuccess();
      toast({
        title: "Success",
        description: `File ${fileName} created successfully`
      });
    } catch (error) {
      console.error("Error creating file:", error);
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Button onClick={handleCreateFile}>Create</Button>
  );
};

// Component to handle folder creation
const FileSystemCreateFolder = ({ folderName, path, onSuccess }) => {
  const { createFolder } = useFileSystem();
  const { toast } = useToast();
  
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a folder name",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await createFolder(path, folderName);
      onSuccess();
      toast({
        title: "Success",
        description: `Folder ${folderName} created successfully`
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Button onClick={handleCreateFolder}>Create</Button>
  );
};

// Component to display and manage the current path
const FileSystemControls = ({ currentPath, setCurrentPath }) => {
  return (
    <div className="flex items-center p-2 bg-gray-50 border-b text-sm">
      <span className="truncate">Path: {currentPath}</span>
    </div>
  );
};

const DashboardContent = () => {
  const [showFiles, setShowFiles] = useState(true);
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isGitHubDialogOpen, setIsGitHubDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const { refreshFiles } = useFileSystem();
  
  // Access GitHub context safely
  const gitHubContext = useGitHub();
  const { authState } = gitHubContext;
  
  // Debug logs for initialization
  useEffect(() => {
    console.log('DashboardContent - Initial render');
    console.log('DashboardContent - Auth state:', { user, authLoading });
    console.log('DashboardContent - GitHub auth state:', authState);
  }, []);
  
  // Effect for debugging auth state changes
  useEffect(() => {
    console.log('DashboardContent - Auth state update:', { user, authLoading });
    console.log('DashboardContent - GitHub auth state update:', authState);
  }, [user, authLoading, authState]);

  const handleLogout = async () => {
    await logout();
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
  };

  const handleCreateFile = () => {
    setNewFileName('');
    setIsNewFileDialogOpen(true);
  };

  const handleCreateFolder = () => {
    setNewFolderName('');
    setIsNewFolderDialogOpen(true);
  };
  
  const handleOpenGitHubDialog = () => {
    setIsGitHubDialogOpen(true);
  };
  
  // Handle manual file refresh with error handling
  const handleRefreshFiles = async () => {
    console.log('Dashboard - Manual file refresh triggered');
    try {
      await refreshFiles();
      toast({
        title: "Files refreshed",
        description: "Files have been refreshed successfully"
      });
    } catch (error) {
      console.error("Error refreshing files:", error);
      toast({
        title: "Error",
        description: "Failed to refresh files. Please try again.",
        variant: "destructive"
      });
    }
  };
  
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
          {/* Add TestButton next to GitHub button */}
          
          {/* Add Reflection Button */}
          <ReflectionButton />
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={handleOpenGitHubDialog}
          >
            <Github size={16} />
            GitHub {authState?.isAuthenticated ? `(${authState.username})` : ''}
          </Button>
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
                  onClick={handleCreateFile}
                  title="Create new file"
                >
                  <FilePlus size={16} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleCreateFolder}
                  title="Create new folder"
                >
                  <FolderPlus size={16} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Refresh files"
                  onClick={handleRefreshFiles}
                >
                  <RefreshCw size={16} />
                </Button>
              </div>
            </div>
            <FileSystemControls currentPath={currentPath} setCurrentPath={setCurrentPath} />
            <div className="flex-1 overflow-auto">
              <FileExplorer />
            </div>
            
            {/* GitHub Commit Panel - Always render container which handles conditional display */}
            <GitHubCommitPanelContainer />
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

      {/* Dialogs */}
      <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter file name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFileDialogOpen(false)}>Cancel</Button>
            <FileSystemCreateFile 
              fileName={newFileName} 
              path={currentPath} 
              onSuccess={() => setIsNewFileDialogOpen(false)} 
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
            <FileSystemCreateFolder 
              folderName={newFolderName} 
              path={currentPath} 
              onSuccess={() => setIsNewFolderDialogOpen(false)} 
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* GitHub Dialog */}
      <Dialog open={isGitHubDialogOpen} onOpenChange={setIsGitHubDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>GitHub Integration</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <GitHubAuth />
            <GitHubRepoSelector />
          </div>
          <DialogFooter>
            <Button onClick={() => setIsGitHubDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Dashboard = () => {
  console.log('Dashboard - Component initialized');
  return (
    <ChatProvider>
      <FileSystemProvider>
        <GitHubProvider>
          <DashboardContent />
        </GitHubProvider>
      </FileSystemProvider>
    </ChatProvider>
  );
};

export default Dashboard;
