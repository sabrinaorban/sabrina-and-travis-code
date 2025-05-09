
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from 'lucide-react';
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
  const handleSync = async () => {
    // Prevent multiple syncs
    if (isSyncing) return;
    
    try {
      await onSync();
    } catch (error) {
      console.error("SyncDialog - Error during sync:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
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
