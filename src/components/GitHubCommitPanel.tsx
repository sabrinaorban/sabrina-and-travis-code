
import React, { useState } from 'react';
import { useGitHub } from '@/contexts/GitHubContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GitCommit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const GitHubCommitPanel: React.FC = () => {
  const { authState, currentRepo, currentBranch, saveFileToRepo, isLoading } = useGitHub();
  const { fileSystem } = useFileSystem();
  const [commitMessage, setCommitMessage] = useState('');

  if (!authState.isAuthenticated || !currentRepo || !currentBranch) {
    return null;
  }

  const selectedFile = fileSystem.selectedFile;

  const handleCommit = async () => {
    if (!selectedFile || !commitMessage.trim()) return;
    
    try {
      // Get the GitHub path for this file (strip the leading slash)
      const githubPath = selectedFile.path.startsWith('/') 
        ? selectedFile.path.substring(1) 
        : selectedFile.path;
      
      const result = await saveFileToRepo(
        githubPath,
        selectedFile.content || '',
        commitMessage
      );
      
      if (result) {
        toast({
          title: "Success",
          description: `Changes pushed to ${currentRepo.full_name} (${currentBranch})`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to push changes",
          variant: "destructive"
        });
      }
      
      setCommitMessage('');
    } catch (error) {
      console.error("Error committing file:", error);
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
      <CardContent className="pb-2">
        <Textarea
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          rows={2}
          className="text-sm"
          disabled={!selectedFile || isLoading}
        />
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full"
          disabled={!selectedFile || !commitMessage.trim() || isLoading}
          onClick={handleCommit}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Pushing...
            </>
          ) : (
            'Commit & Push'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
