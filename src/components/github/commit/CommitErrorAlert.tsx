
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface CommitErrorAlertProps {
  error: string | null;
}

export const CommitErrorAlert: React.FC<CommitErrorAlertProps> = ({ error }) => {
  if (!error) {
    return null;
  }
  
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};
