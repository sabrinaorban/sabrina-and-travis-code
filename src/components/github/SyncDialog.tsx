
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SyncDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: () => void;
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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only allow closing the dialog if not syncing
      if (!isSyncing) {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Replace Project Files with Repository</DialogTitle>
          <DialogDescription>
            This will <strong>replace all existing files</strong> in your workspace with files from <strong>{repoName}</strong> branch <strong>{branchName}</strong>. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {syncError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{syncError}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              console.log('SyncDialog - Sync dialog canceled');
              onOpenChange(false);
            }} 
            disabled={isSyncing}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={() => {
              console.log('SyncDialog - Sync operation started');
              onSync();
            }}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Replacing Files...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Replace All Files
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
