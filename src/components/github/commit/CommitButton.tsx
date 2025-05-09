
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface CommitButtonProps {
  isCommitting: boolean;
  isLoading: boolean;
  disabled: boolean;
  fileCount: number;
  onClick: () => void;
}

export const CommitButton: React.FC<CommitButtonProps> = ({
  isCommitting,
  isLoading,
  disabled,
  fileCount,
  onClick
}) => {
  return (
    <Button 
      className="w-full"
      disabled={disabled}
      onClick={() => {
        console.log('CommitButton - Commit button clicked');
        onClick();
      }}
    >
      {(isLoading || isCommitting) ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {isCommitting ? 'Pushing...' : 'Loading...'}
        </>
      ) : (
        `Commit & Push (${fileCount})`
      )}
    </Button>
  );
};
