
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { FileEntry } from '@/types';

interface ModifiedFilesListProps {
  files: FileEntry[];
}

export const ModifiedFilesList: React.FC<ModifiedFilesListProps> = ({ files }) => {
  if (files.length === 0) {
    return null;
  }
  
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">
          {files.length} file{files.length !== 1 ? 's' : ''} to commit
        </span>
        <Badge variant="outline" className="text-xs">
          {files.length}
        </Badge>
      </div>
      
      <ScrollArea className="h-24 w-full rounded-md border">
        <div className="p-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center text-xs py-1">
              <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{file.path}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </>
  );
};
