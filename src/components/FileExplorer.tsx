
import React, { useState } from 'react';
import { FileEntry } from '../types';
import { useFileSystem } from '../contexts/FileSystemContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { File, Trash } from 'lucide-react';

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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = () => {
    if (file.type === 'file') {
      onSelect(file);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFile(file.id);
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center py-1 px-2 hover:bg-muted rounded cursor-pointer',
          isSelected && 'bg-muted'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={file.type === 'file' ? handleSelect : handleToggle}
      >
        {file.type === 'folder' && (
          <span className="mr-1" onClick={handleToggle}>
            {isOpen ? '▼' : '►'}
          </span>
        )}
        
        {file.type === 'file' && (
          <File size={16} className="mr-1.5 text-blue-500" />
        )}
        
        <span className="flex-grow truncate">{file.name}</span>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
          onClick={handleDelete}
        >
          <Trash size={14} />
        </Button>
      </div>

      {file.type === 'folder' && isOpen && file.children && (
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
  const { fileSystem, selectFile } = useFileSystem();
  
  const handleSelectFile = (file: FileEntry) => {
    selectFile(file);
  };

  return (
    <div className="overflow-auto h-full bg-white border-r">
      <div className="p-3 border-b">
        <h2 className="font-semibold">Project Files</h2>
      </div>
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
    </div>
  );
};
