
import React, { useState, useEffect } from 'react';
import { FileEntry } from '../types';
import { useFileSystem } from '../contexts/FileSystemContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { File, Folder, FolderOpen, Trash, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileNodeProps {
  file: FileEntry;
  depth: number;
  onSelect: (file: FileEntry) => void;
  selectedFileId?: string | null;
}

const FileNode: React.FC<FileNodeProps> = ({
  file,
  depth,
  onSelect,
  selectedFileId,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const { deleteFile } = useFileSystem();
  const isSelected = selectedFileId === file.id;
  const { toast } = useToast();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = () => {
    if (file.type === 'file') {
      onSelect(file);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      deleteFile(file.id).then(() => {
        toast({
          title: "Deleted",
          description: `${file.name} was deleted successfully`,
        });
      }).catch(err => {
        toast({
          title: "Error",
          description: `Failed to delete ${file.name}`,
          variant: "destructive"
        });
      });
    }
  };

  return (
    <div className="group">
      <div
        className={cn(
          'flex items-center py-1 px-2 hover:bg-muted rounded cursor-pointer group relative',
          isSelected && 'bg-muted'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleSelect}
      >
        {file.type === 'folder' && (
          <span className="mr-1">
            {isOpen ? 
              <FolderOpen size={16} className="text-yellow-500" /> : 
              <Folder size={16} className="text-yellow-500" />
            }
          </span>
        )}
        
        {file.type === 'file' && (
          <File size={16} className="mr-1.5 text-blue-500" />
        )}
        
        <span className="flex-grow truncate">{file.name}</span>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={handleDelete}
          title="Delete"
        >
          <Trash size={14} />
        </Button>
      </div>

      {file.type === 'folder' && isOpen && file.children && file.children.length > 0 && (
        <div>
          {file.children.map((child) => (
            <FileNode
              key={child.id}
              file={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedFileId={selectedFileId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC = () => {
  const { fileSystem, selectFile, refreshFiles, isLoading } = useFileSystem();
  const { toast } = useToast();
  
  const handleSelectFile = (file: FileEntry) => {
    selectFile(file);
  };

  const handleRefresh = async () => {
    try {
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
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh Files"
        >
          <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
        </Button>
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
        <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-4">
          <p className="text-sm text-center">No files found</p>
          <p className="text-xs text-center mt-2">
            Use the "+" buttons above to create files and folders
          </p>
        </div>
      )}
    </div>
  );
};
