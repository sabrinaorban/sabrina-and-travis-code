
import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useFileSystem } from '../contexts/FileSystemContext';
import { Save, Undo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CodeEditor: React.FC = () => {
  const { fileSystem, updateFile } = useFileSystem();
  const [content, setContent] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (fileSystem.selectedFile) {
      const initialContent = fileSystem.selectedFile.content || '';
      setContent(initialContent);
      setHistory([initialContent]);
      setHistoryIndex(0);
      setIsDirty(false);
    }
  }, [fileSystem.selectedFile]);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsDirty(true);
    
    // Add to history when typing stops (debounce)
    const timeoutId = setTimeout(() => {
      if (newContent !== history[historyIndex]) {
        // Add new content to history, removing any future history (if we've gone back)
        const newHistory = [...history.slice(0, historyIndex + 1), newContent];
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      // Go back one step in history
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
      setIsDirty(true);
      
      toast({
        title: "Undone",
        description: "Your last changes have been undone"
      });
    } else {
      toast({
        title: "No more history",
        description: "Nothing to undo"
      });
    }
  };
  
  const handleSave = async () => {
    if (fileSystem.selectedFile && isDirty) {
      try {
        await updateFile(fileSystem.selectedFile.id, content);
        setIsDirty(false);
        toast({
          title: "Saved",
          description: `${fileSystem.selectedFile.name} saved successfully`
        });
      } catch (error) {
        console.error("Error saving file:", error);
        toast({
          title: "Error",
          description: "Failed to save file",
          variant: "destructive"
        });
      }
    }
  };
  
  if (!fileSystem.selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 text-gray-500 p-4">
        <FileText size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-medium mb-2">No file selected</h3>
        <p className="text-sm text-center max-w-md">
          Select a file from the file explorer to view and edit its content, 
          or create a new file using the file explorer controls.
        </p>
      </div>
    );
  }
  
  const canUndo = historyIndex > 0;
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <div className="font-medium truncate">
          {fileSystem.selectedFile.path}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex items-center gap-1"
            title="Undo changes"
            variant="outline"
          >
            <Undo size={14} />
            <span>Undo</span>
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={!isDirty}
            className="flex items-center gap-1"
          >
            <Save size={14} />
            <span>Save</span>
          </Button>
        </div>
      </div>
      <Textarea
        value={content}
        onChange={handleChange}
        className="flex-1 rounded-none border-0 font-mono resize-none p-4 focus-visible:ring-0"
        placeholder="File content..."
      />
    </div>
  );
};

// Import FileText at the top level to fix error
import { FileText } from 'lucide-react';
