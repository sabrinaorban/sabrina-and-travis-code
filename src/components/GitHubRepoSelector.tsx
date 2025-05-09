
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Code } from 'lucide-react';

import { RepoSelector } from './github/RepoSelector';
import { BranchSelector } from './github/BranchSelector';
import { SyncError } from './github/SyncError';
import { SyncDialog } from './github/SyncDialog';
import { useGitHubRepoSelector } from './github/useGitHubRepoSelector';

export const GitHubRepoSelector: React.FC = () => {
  const {
    authState,
    repositories,
    currentRepo,
    currentBranch,
    branches,
    isLoading,
    fileSystemLoading,
    isSyncing,
    isFetchingBranches,
    isSyncDialogOpen,
    syncError,
    selectingRepoRef,
    handleRepositoryChange,
    handleBranchChange,
    handleSync,
    fetchRepositories,
    setIsSyncDialogOpen,
  } = useGitHubRepoSelector();
  
  // Safe check if authenticated
  if (!authState?.isAuthenticated) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Code className="h-4 w-4" />
            GitHub Repositories
          </CardTitle>
          <CardDescription>
            Select a repository and branch to work with
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <RepoSelector
              repositories={repositories || []}
              currentRepo={currentRepo}
              isLoading={isLoading}
              isSelecting={selectingRepoRef.current}
              fetchRepositories={fetchRepositories}
              onRepositoryChange={handleRepositoryChange}
            />

            {currentRepo && (
              <BranchSelector
                branches={branches || []}
                currentBranch={currentBranch}
                isLoading={isLoading}
                isFetchingBranches={isFetchingBranches}
                onBranchChange={handleBranchChange}
              />
            )}
          </div>
          
          <SyncError error={syncError} />
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full"
            disabled={isLoading || isSyncing || fileSystemLoading || !currentRepo || !currentBranch}
            onClick={() => {
              console.log('GitHubRepoSelector - Opening sync dialog');
              setIsSyncDialogOpen(true);
            }}
          >
            {(isLoading || isSyncing || fileSystemLoading) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isSyncing ? 'Importing...' : 'Working...'}
              </>
            ) : (
              'Import Repository Files'
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <SyncDialog
        isOpen={isSyncDialogOpen}
        onOpenChange={setIsSyncDialogOpen}
        onSync={handleSync}
        isSyncing={isSyncing}
        syncError={syncError}
        repoName={currentRepo?.full_name || ''}
        branchName={currentBranch || ''}
      />
    </>
  );
};
