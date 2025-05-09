
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SyncDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  syncError: string | null;
  repoName: string;
  branchName: string;
}

export const SyncDialog: React.FC<SyncDialogProps> = ({
  isOpen,
  onOpenChange,
  onSync,
  isSyncing,
  syncError,
  repoName,
  branchName,
}) => {
  const [syncComplete, setSyncComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSyncComplete(false);
      setIsProcessing(false);
    }
  }, [isOpen]);
  
  // Update sync complete state when syncing completes
  useEffect(() => {
    if (isProcessing && !isSyncing && !syncError) {
      setSyncComplete(true);
      // Auto-close after success
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, isSyncing, syncError, onOpenChange]);

  const handleSync = async () => {
    // Prevent multiple syncs
    if (isSyncing || isProcessing) return;
    
    setIsProcessing(true);
    setSyncComplete(false);
    
    try {
      await onSync();
    } catch (error) {
      console.error("SyncDialog - Error during sync:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing while syncing
      if (isSyncing && !open) return;
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Repository Files</DialogTitle>
          <DialogDescription>
            This will import files from <strong>{repoName}</strong> ({branchName}) into your project.
            Any existing files will be deleted.
          </DialogDescription>
        </DialogHeader>
        
        {syncError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{syncError}</AlertDescription>
          </Alert>
        )}
        
        {syncComplete && !syncError && (
          <Alert variant="default" className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>Files imported successfully!</AlertDescription>
          </Alert>
        )}
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This operation may take some time depending on the repository size.
            The page will refresh automatically when complete.
          </p>
        </div>
        
        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
            disabled={isSyncing}
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleSync}
            disabled={isSyncing || syncComplete}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : syncComplete ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </>
            ) : (
              'Import Files'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
