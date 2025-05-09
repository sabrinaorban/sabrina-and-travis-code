
import { useState } from 'react';
import { FileEntry } from '@/types';

/**
 * Hook for managing GitHub commit panel state
 */
export const useCommitPanelState = () => {
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [commitError, setCommitError] = useState<string | null>(null);
  const [editedFiles, setEditedFiles] = useState<FileEntry[]>([]);

  const startCommit = () => {
    setIsCommitting(true);
    setCommitError(null);
  };

  const finishCommit = (success: boolean, error?: string) => {
    setIsCommitting(false);
    if (!success && error) {
      setCommitError(error);
    } else {
      setCommitError(null);
      // Clear commit message on successful commit
      if (success) {
        setCommitMessage('');
      }
    }
  };

  const updateEditedFiles = (files: FileEntry[]) => {
    setEditedFiles(files);
  };

  return {
    isCommitting,
    commitMessage,
    setCommitMessage,
    commitError,
    setCommitError,
    editedFiles,
    startCommit,
    finishCommit,
    updateEditedFiles
  };
};
