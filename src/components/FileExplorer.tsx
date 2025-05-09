
import React, { useState } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FileNode from './FileExplorer/FileNode';
import EmptyFilesPlaceholder from './FileExplorer/EmptyFilesPlaceholder';
import RefreshControl from './FileExplorer/RefreshControl';
import { FileEntry } from '../types';

export const FileExplorer: React.FC = () => {
  const { fileSystem, selectFile, refreshFiles, isLoading } = useFileSystem();
  const { toast } = useToast();
  
  const handleSelectFile = (file: FileEntry) => {
    selectFile(file);
  };

  // Manual refresh function only - no auto refresh
  const handleRefresh = async () => {
    try {
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
        <RefreshControl onRefresh={handleRefresh} isLoading={isLoading} />
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
