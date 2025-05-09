
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface EmptyFilesPlaceholderProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export const EmptyFilesPlaceholder: React.FC<EmptyFilesPlaceholderProps> = ({
  onRefresh,
  isLoading
}) => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-4">
      <p className="text-sm text-center">No files found</p>
      <p className="text-xs text-center mt-2">
        Use the "+" buttons above to create files and folders
      </p>
      <Button 
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="mt-4"
      >
        <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Retry Refresh
      </Button>
    </div>
  );
};

export default EmptyFilesPlaceholder;
