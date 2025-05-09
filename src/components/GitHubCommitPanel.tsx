
import React, { useState, useEffect } from 'react';
import { useGitHub } from '@/contexts/GitHubContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, GitCommit, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FileEntry } from '@/types';
import { supabase } from '@/lib/supabase';

export const GitHubCommitPanel: React.FC = () => {
  const [commitMessage, setCommitMessage] = useState('');
  const [editedFiles, setEditedFiles] = useState<FileEntry[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [lastCommitTime, setLastCommitTime] = useState(0);
  const { toast } = useToast();

  // Get GitHub context safely
  const github = useGitHub();
  const { authState, currentRepo, currentBranch, saveFileToRepo, isLoading } = github;
  
  // Get file system context safely
  const { getModifiedFiles } = useFileSystem();
  
  // Track which files have been edited since last commit
  useEffect(() => {
    if (getModifiedFiles) {
      const modifiedFiles = getModifiedFiles();
      console.log('Found modified files:', modifiedFiles.length);
      setEditedFiles(modifiedFiles);
    }
  }, [getModifiedFiles]);

  // Only render when all required data is available
  // This ensures the panel only appears when GitHub is authenticated AND repo is selected
  if (!authState?.isAuthenticated || !currentRepo || !currentBranch) {
    return null;
  }

  const handleCommit = async () => {
    if (!commitMessage.trim() || editedFiles.length === 0) return;
    
    // Prevent multiple rapid commit attempts
    const now = Date.now();
    if (now - lastCommitTime < 5000) {
      console.log('Commit attempted too quickly, debouncing...');
      return;
    }
    
    // Don't allow multiple commits at once
    if (isCommitting) {
      console.log('Already committing, ignoring request');
      return;
    }
    
    setIsCommitting(true);
    setLastCommitTime(now);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      // Process each edited file
      for (const file of editedFiles) {
        // Get the GitHub path for this file (strip the leading slash)
        const githubPath = file.path.startsWith('/') 
          ? file.path.substring(1) 
          : file.path;
        
        console.log(`Committing file: ${githubPath}`);
        
        const result = await saveFileToRepo(
          githubPath,
          file.content || '',
          commitMessage
        );
        
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} files pushed to ${currentRepo.full_name} (${currentBranch})`,
        });
        
        // Reset modified status in database
        await Promise.all(editedFiles.map(async (file) => {
          await supabase
            .from('files')
            .update({ is_modified: false })
            .eq('id', file.id);
        }));
        
        // Clear commit message after successful commit
        setCommitMessage('');
        
        // Refresh the list of modified files after commit
        if (getModifiedFiles) {
          setEditedFiles(getModifiedFiles());
        }
      }
      
      if (failCount > 0) {
        toast({
          title: "Warning",
          description: `${failCount} files failed to push`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error committing files:", error);
      toast({
        title: "Error",
        description: "Failed to push changes",
        variant: "destructive"
      });
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCommit className="h-4 w-4" />
          Commit Changes to GitHub
        </CardTitle>
        <CardDescription className="text-xs">
          Push your changes to {currentRepo.full_name} ({currentBranch})
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            {editedFiles.length} file{editedFiles.length !== 1 ? 's' : ''} to commit
          </span>
          {editedFiles.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {editedFiles.length}
            </Badge>
          )}
        </div>
        
        {editedFiles.length > 0 && (
          <ScrollArea className="h-24 w-full rounded-md border">
            <div className="p-2">
              {editedFiles.map((file) => (
                <div key={file.id} className="flex items-center text-xs py-1">
                  <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{file.path}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <Textarea
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          rows={2}
          className="text-sm"
          disabled={editedFiles.length === 0 || isLoading || isCommitting}
        />
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full"
          disabled={editedFiles.length === 0 || !commitMessage.trim() || isLoading || isCommitting}
          onClick={handleCommit}
        >
          {(isLoading || isCommitting) ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Pushing...
            </>
          ) : (
            `Commit & Push (${editedFiles.length})`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
