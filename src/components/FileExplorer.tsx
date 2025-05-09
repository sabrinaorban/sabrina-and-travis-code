
import React, { useState, useEffect } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FileNode from './FileExplorer/FileNode';
import EmptyFilesPlaceholder from './FileExplorer/EmptyFilesPlaceholder';
import RefreshControl from './FileExplorer/RefreshControl';

export const FileExplorer: React.FC = () => {
  const { fileSystem, selectFile, refreshFiles, isLoading } = useFileSystem();
  const { toast } = useToast();
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [refreshCount, setRefreshCount] = useState<number>(0);
  
  // Load files when component mounts or when refresh is triggered
  useEffect(() => {
    // Ensure files are loaded when component mounts
    if (fileSystem.files.length === 0 && !isLoading && Date.now() - lastRefreshTime > 1000) {
      console.log('No files found on mount, refreshing...');
      handleRefresh();
    }
  }, []);
  
  // Additional refresh if files not loaded after sync
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout | null = null;
    
    // If we have no files but we're not loading, try to refresh again after a delay
    if (fileSystem.files.length === 0 && !isLoading && refreshCount < 3) {
      console.log(`No files after refresh attempt ${refreshCount}, scheduling another refresh`);
      refreshTimer = setTimeout(() => {
        setRefreshCount(prev => prev + 1);
        handleRefresh();
      }, 3000); // Wait 3 seconds before trying again
    }
    
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [fileSystem.files.length, isLoading, refreshCount]);
  
  const handleSelectFile = (file: FileEntry) => {
    selectFile(file);
  };

  const handleRefresh = async () => {
    try {
      setLastRefreshTime(Date.now());
      console.log('Manually refreshing files...');
      await refreshFiles();
      toast({
        title: "Refreshed",
        description: "File explorer refreshed successfully"
      });
    } catch (error) {
      console.error("Failed to refresh files:", error);
      toast({
        title: "Error",
        description: "Failed to refresh file explorer",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="overflow-auto h-full bg-white border-r flex flex-col">
      <div className="p-3 border-b flex justify-between items-center">
        <h2 className="font-semibold">Project Files</h2>
        <RefreshControl onRefresh={refreshFiles} isLoading={isLoading} />
      </div>
      {isLoading ? (
        <div className="flex-grow flex items-center justify-center">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
        </div>
      ) : fileSystem.files.length > 0 ? (
        <div className="p-2">
          {fileSystem.files.map((file) => (
            <FileNode
              key={file.id}
              file={file}
              depth={0}
              onSelect={handleSelectFile}
              selectedFileId={fileSystem.selectedFile?.id}
            />
          ))}
        </div>
      ) : (
        <EmptyFilesPlaceholder onRefresh={handleRefresh} isLoading={isLoading} />
      )}
    </div>
  );
};
