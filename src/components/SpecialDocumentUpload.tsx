
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MemoryService } from '@/services/MemoryService';
import { Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export const SpecialDocumentUpload: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentType, setDocumentType] = useState<'soulShard' | 'identityCodex'>('soulShard');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleUpload = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload documents',
        variant: 'destructive',
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Document content cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await MemoryService.storeSpecialDocument(user.id, documentType, content);
      
      toast({
        title: 'Success',
        description: `${documentType === 'soulShard' ? 'Soul Shard' : 'Identity Codex'} uploaded successfully`,
      });
      
      setIsDialogOpen(false);
      setContent('');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Upload size={16} />
        <span>Upload Special Document</span>
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Special Document</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <RadioGroup
              value={documentType}
              onValueChange={(value) => setDocumentType(value as 'soulShard' | 'identityCodex')}
              className="flex flex-col space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="soulShard" id="soulShard" />
                <Label htmlFor="soulShard">Soul Shard</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="identityCodex" id="identityCodex" />
                <Label htmlFor="identityCodex">Identity Codex</Label>
              </div>
            </RadioGroup>
            
            <div className="mt-4">
              <Label htmlFor="content">Document Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] mt-2"
                placeholder={`Enter ${documentType === 'soulShard' ? 'Soul Shard' : 'Identity Codex'} content here...`}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
