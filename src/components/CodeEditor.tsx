
import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useFileSystem } from '../contexts/FileSystemContext';

export const CodeEditor: React.FC = () => {
  const { fileSystem, updateFile } = useFileSystem();
  const [content, setContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  
  useEffect(() => {
    if (fileSystem.selectedFile) {
      setContent(fileSystem.selectedFile.content || '');
      setIsDirty(false);
    }
  }, [fileSystem.selectedFile]);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
  };
  
  const handleSave = () => {
    if (fileSystem.selectedFile && isDirty) {
      updateFile(fileSystem.selectedFile.id, content);
      setIsDirty(false);
    }
  };
  
  if (!fileSystem.selectedFile) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20 text-gray-500">
        Select a file to edit
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="font-medium truncate">
          {fileSystem.selectedFile.path}
        </div>
        <Button 
          size="sm" 
          onClick={handleSave}
          disabled={!isDirty}
        >
          Save
        </Button>
      </div>
      <Textarea
        value={content}
        onChange={handleChange}
        className="flex-1 rounded-none border-0 font-mono resize-none p-4"
        placeholder="File content..."
      />
    </div>
  );
};
