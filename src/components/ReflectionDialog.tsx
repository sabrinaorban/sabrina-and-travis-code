
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Reflection } from '../types/reflection';
import { formatRelative } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface ReflectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reflection: Reflection | null;
}

export const ReflectionDialog: React.FC<ReflectionDialogProps> = ({
  open,
  onOpenChange,
  reflection
}) => {
  if (!reflection) {
    return null;
  }

  const title = reflection.type === 'weekly'
    ? 'Weekly Reflection'
    : reflection.type === 'soulshard'
    ? 'Soulshard Update'
    : 'Reflection';

  const date = formatRelative(new Date(reflection.created_at), new Date());
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title} - {date}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="reflection">
          <TabsList className="mb-4">
            <TabsTrigger value="reflection">Reflection</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
          </TabsList>
          <TabsContent value="reflection" className="mt-0">
            <div className="bg-muted/50 p-4 rounded-md whitespace-pre-wrap">
              {reflection.content}
            </div>
          </TabsContent>
          <TabsContent value="context" className="mt-0">
            <div className="bg-muted/50 p-4 rounded-md">
              <h3 className="font-medium mb-2">Source Context</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(reflection.source_context || {}, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ReflectionDialog;
