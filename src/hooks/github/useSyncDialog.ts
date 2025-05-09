
import { useState } from 'react';

export const useSyncDialog = () => {
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  
  return {
    isSyncDialogOpen,
    setIsSyncDialogOpen,
    openSyncDialog: () => setIsSyncDialogOpen(true),
    closeSyncDialog: () => setIsSyncDialogOpen(false)
  };
};
