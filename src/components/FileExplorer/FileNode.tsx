
import React, { useState } from 'react';
import { FileEntry } from '../../types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { File, Folder, FolderOpen, Trash, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFileSystem } from '@/contexts/FileSystemContext';

interface FileNodeProps {
  file: FileEntry;
  depth: number;
  onSelect: (file: FileEntry) => void;
  selectedFileId?: string | null;
}

export const FileNode: React.FC<FileNodeProps> = ({
  file,
  depth,
  onSelect,
  selectedFileId,
}) => {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto-expand top-level folders
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
      // Toggle open state when clicking on folder
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
          <span className="mr-1" onClick={handleToggle}>
            {isOpen ? 
              <ChevronDown size={16} className="text-gray-500" /> : 
              <ChevronRight size={16} className="text-gray-500" />
            }
          </span>
        )}
        
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
        
        <span className="flex-grow truncate">
          {file.name}
          {file.isModified && <span className="ml-1 text-xs text-orange-500">•</span>}
        </span>
        
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

export default FileNode;
