
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SyncErrorProps {
  error: string | null;
}

export const SyncError: React.FC<SyncErrorProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};
