
import React from 'react';
import { useGitHub } from '@/contexts/github';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { GitCommit } from 'lucide-react';
import { useCommitPanel } from '@/hooks/github/useCommitPanel';
import { CommitButton } from './github/commit/CommitButton';
import { ModifiedFilesList } from './github/commit/ModifiedFilesList';
import { CommitErrorAlert } from './github/commit/CommitErrorAlert';

export const GitHubCommitPanel: React.FC = () => {
  // Get GitHub context safely
  const github = useGitHub();
  const { authState, currentRepo, currentBranch, saveFileToRepo, isLoading } = github;
  
  // Get file system context safely
  const { getModifiedFiles } = useFileSystem();

  // Use our custom hook to handle all commit logic
  const {
    commitMessage,
    setCommitMessage,
    editedFiles,
    isCommitting,
    commitError,
    handleCommit
  } = useCommitPanel(
    getModifiedFiles || (() => []),
    saveFileToRepo,
    currentRepo?.full_name || '',
    currentBranch || ''
  );

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
        <ModifiedFilesList files={editedFiles} />
        
        <Textarea
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          rows={2}
          className="text-sm"
          disabled={editedFiles.length === 0 || isLoading || isCommitting}
        />

        <CommitErrorAlert error={commitError} />
      </CardContent>
      <CardFooter>
        <CommitButton 
          isCommitting={isCommitting}
          isLoading={isLoading}
          disabled={editedFiles.length === 0 || !commitMessage.trim() || isLoading || isCommitting}
          fileCount={editedFiles.length}
          onClick={handleCommit}
        />
      </CardFooter>
    </Card>
  );
};
