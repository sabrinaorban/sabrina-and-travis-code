
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
  const { toast } = useToast();

  // Get GitHub context safely
  const github = useGitHub();
  const { authState, currentRepo, currentBranch, saveFileToRepo, isLoading } = github;
  
  // Get file system context safely
  const { getModifiedFiles, refreshFiles } = useFileSystem();
  
  // Track which files have been edited since last commit
  useEffect(() => {
    if (getModifiedFiles) {
      const modifiedFiles = getModifiedFiles();
      console.log('Found modified files:', modifiedFiles.length);
      setEditedFiles(modifiedFiles);
    }
  }, [getModifiedFiles]);

  // Refresh files periodically to detect changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (authState?.isAuthenticated && currentRepo && currentBranch) {
        refreshFiles();
      }
    }, 5000); // Check for changes every 5 seconds
    
    return () => clearInterval(interval);
  }, [authState, currentRepo, currentBranch, refreshFiles]);

  // Only render when all required data is available
  if (!authState?.isAuthenticated || !currentRepo || !currentBranch) {
    return null;
  }

  const handleCommit = async () => {
    if (!commitMessage.trim() || editedFiles.length === 0) return;
    
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
        
        // Refresh files to update UI
        await refreshFiles();
      }
      
      if (failCount > 0) {
        toast({
          title: "Warning",
          description: `${failCount} files failed to push`,
          variant: "destructive"
        });
      }
      
      setCommitMessage('');
    } catch (error) {
      console.error("Error committing files:", error);
      toast({
        title: "Error",
        description: "Failed to push changes",
        variant: "destructive"
      });
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
          disabled={editedFiles.length === 0 || isLoading}
        />
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full"
          disabled={editedFiles.length === 0 || !commitMessage.trim() || isLoading}
          onClick={handleCommit}
        >
          {isLoading ? (
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
