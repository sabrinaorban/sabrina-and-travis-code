
import { useState } from 'react';

/**
 * A hook for managing the GitHub repository sync dialog state
 */
export const useSyncDialog = () => {
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  
  const startSync = () => {
    setSyncInProgress(true);
    setSyncErrorMessage(null);
  };
  
  const finishSync = (success: boolean, error?: string) => {
    setSyncInProgress(false);
    setSyncErrorMessage(success ? null : (error || 'Unknown error occurred'));
  };
  
  return {
    isSyncDialogOpen,
    setIsSyncDialogOpen,
    openSyncDialog: () => setIsSyncDialogOpen(true),
    closeSyncDialog: () => setIsSyncDialogOpen(false),
    syncInProgress,
    startSync,
    finishSync,
    syncErrorMessage
  };
};
