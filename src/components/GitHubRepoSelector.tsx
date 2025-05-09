
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Code, AlertCircle } from 'lucide-react';

import { RepoSelector } from './github/RepoSelector';
import { BranchSelector } from './github/BranchSelector';
import { SyncError } from './github/SyncError';
import { SyncDialog } from './github/SyncDialog';
import { useGitHubRepoSelector } from './github/useGitHubRepoSelector';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  
  const { toast } = useToast();
  
  // Effect for initial repositories load
  useEffect(() => {
    // Only fetch repositories once when authenticated
    if (authState?.isAuthenticated && (!repositories || repositories.length === 0) && !isLoading) {
      console.log("GitHubRepoSelector - Loading repositories on mount");
      fetchRepositories().catch(error => {
        console.error("GitHubRepoSelector - Error fetching repositories:", error);
        toast({
          title: "Error loading repositories",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
      });
    }
  }, [authState?.isAuthenticated, repositories, isLoading, fetchRepositories, toast]);
  
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
            {/* Show initial loading state */}
            {isLoading && !repositories?.length && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <AlertDescription>Loading repositories...</AlertDescription>
              </Alert>
            )}
            
            {/* Show error if no repositories found after loading */}
            {!isLoading && authState?.isAuthenticated && (!repositories || repositories.length === 0) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>
                  No repositories found. Make sure you have access to repositories in your GitHub account.
                </AlertDescription>
              </Alert>
            )}
            
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
