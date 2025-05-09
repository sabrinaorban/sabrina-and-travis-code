import React, { useState, useEffect, useRef } from 'react';
import { useGitHub } from '@/contexts/github';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, GitCommit, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FileEntry } from '@/types';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const GitHubCommitPanel: React.FC = () => {
  const [commitMessage, setCommitMessage] = useState('');
  const [editedFiles, setEditedFiles] = useState<FileEntry[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Refs to handle cooldowns and prevent rapid/multiple commits
  const lastCommitTimeRef = useRef<number>(0);
  const commitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const COMMIT_COOLDOWN_MS = 10000; // 10 seconds cooldown

  // Get GitHub context safely
  const github = useGitHub();
  const { authState, currentRepo, currentBranch, saveFileToRepo, isLoading } = github;
  
  // Get file system context safely
  const { getModifiedFiles } = useFileSystem();
  
  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
      }
    };
  }, []);
  
  // Debug logs
  useEffect(() => {
    console.log('GitHubCommitPanel - Auth state:', authState);
    console.log('GitHubCommitPanel - Current repo:', currentRepo?.full_name);
    console.log('GitHubCommitPanel - Current branch:', currentBranch);
    console.log('GitHubCommitPanel - Loading states:', { isLoading, isCommitting });
    console.log('GitHubCommitPanel - Modified files count:', editedFiles.length);
  }, [authState, currentRepo, currentBranch, isLoading, isCommitting, editedFiles.length]);
  
  // Track which files have been edited since last commit
  useEffect(() => {
    const refreshModifiedFiles = () => {
      if (getModifiedFiles) {
        try {
          const modifiedFiles = getModifiedFiles();
          console.log('GitHubCommitPanel - Found modified files:', modifiedFiles.length);
          setEditedFiles(modifiedFiles);
        } catch (error) {
          console.error('GitHubCommitPanel - Error fetching modified files:', error);
        }
      }
    };
    
    // Refresh immediately when component mounts
    refreshModifiedFiles();
    
    // Set up an interval to periodically check for modified files
    const intervalId = setInterval(refreshModifiedFiles, 5000);
    
    // Clean up when component unmounts
    return () => clearInterval(intervalId);
  }, [getModifiedFiles]);

  // Only render when all required data is available
  // This ensures the panel only appears when GitHub is authenticated AND repo is selected
  if (!authState?.isAuthenticated || !currentRepo || !currentBranch) {
    console.log('GitHubCommitPanel - Not rendering, missing required context:', {
      isAuthenticated: authState?.isAuthenticated,
      hasRepo: !!currentRepo,
      hasBranch: !!currentBranch
    });
    return null;
  }

  const handleCommit = async () => {
    if (!commitMessage.trim() || editedFiles.length === 0) {
      console.log('GitHubCommitPanel - Cannot commit: empty message or no files');
      setCommitError('Please provide a commit message and ensure you have modified files');
      return;
    }
    
    // Reset error state
    setCommitError(null);
    
    // Prevent multiple rapid commit attempts
    const now = Date.now();
    if (now - lastCommitTimeRef.current < COMMIT_COOLDOWN_MS) {
      console.log('GitHubCommitPanel - Commit attempted too quickly, debouncing...');
      setCommitError(`Please wait ${COMMIT_COOLDOWN_MS / 1000} seconds between commit attempts`);
      return;
    }
    
    // Don't allow multiple commits at once
    if (isCommitting) {
      console.log('GitHubCommitPanel - Already committing, ignoring request');
      return;
    }
    
    setIsCommitting(true);
    lastCommitTimeRef.current = now;
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      console.log(`GitHubCommitPanel - Starting commit of ${editedFiles.length} files`);
      
      // Process each edited file
      for (const file of editedFiles) {
        // Get the GitHub path for this file (strip the leading slash)
        const githubPath = file.path.startsWith('/') 
          ? file.path.substring(1) 
          : file.path;
        
        console.log(`GitHubCommitPanel - Committing file: ${githubPath}`);
        
        try {
          if (!file.content && file.content !== '') {
            console.warn(`GitHubCommitPanel - File has no content: ${githubPath}`);
            failCount++;
            continue;
          }
          
          // Updated to match the new signature (no need to pass repo or branch)
          const result = await saveFileToRepo(
            githubPath,
            file.content || '',
            commitMessage
          );
          
          if (result) {
            successCount++;
            console.log(`GitHubCommitPanel - Successfully committed: ${githubPath}`);
          } else {
            failCount++;
            console.error(`GitHubCommitPanel - Failed to commit: ${githubPath}`);
          }
        } catch (error) {
          console.error(`GitHubCommitPanel - Error committing file ${githubPath}:`, error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        console.log(`GitHubCommitPanel - Commit successful: ${successCount} files committed`);
        
        toast({
          title: "Success",
          description: `${successCount} files pushed to ${currentRepo.full_name} (${currentBranch})`,
        });
        
        // Reset modified status in database
        await Promise.all(editedFiles.map(async (file) => {
          try {
            await supabase
              .from('files')
              .update({ is_modified: false })
              .eq('id', file.id);
          } catch (dbError) {
            console.error(`GitHubCommitPanel - Error updating file status for ${file.path}:`, dbError);
          }
        }));
        
        // Clear commit message after successful commit
        setCommitMessage('');
        
        // Refresh the list of modified files after commit
        if (getModifiedFiles) {
          try {
            const updatedFiles = getModifiedFiles();
            console.log('GitHubCommitPanel - Updated modified files count:', updatedFiles.length);
            setEditedFiles(updatedFiles);
          } catch (error) {
            console.error('GitHubCommitPanel - Error updating modified files list:', error);
          }
        }
      }
      
      if (failCount > 0) {
        toast({
          title: "Warning",
          description: `${failCount} files failed to push`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("GitHubCommitPanel - Error committing files:", error);
      setCommitError(error.message || 'Unknown error during commit');
      toast({
        title: "Error",
        description: "Failed to push changes",
        variant: "destructive"
      });
    } finally {
      setIsCommitting(false);
      
      // Set a timeout to allow committing again after the cooldown
      commitTimeoutRef.current = setTimeout(() => {
        console.log('GitHubCommitPanel - Commit cooldown complete');
      }, COMMIT_COOLDOWN_MS);
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

        {/* Show commit error if any */}
        {commitError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{commitError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full"
          disabled={editedFiles.length === 0 || !commitMessage.trim() || isLoading || isCommitting}
          onClick={() => {
            console.log('GitHubCommitPanel - Commit button clicked');
            handleCommit();
          }}
        >
          {(isLoading || isCommitting) ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isCommitting ? 'Pushing...' : 'Loading...'}
            </>
          ) : (
            `Commit & Push (${editedFiles.length})`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
