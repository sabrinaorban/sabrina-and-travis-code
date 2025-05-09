
import React, { useState, useEffect, useRef } from 'react';
import { useGitHub } from '@/contexts/github';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Loader2, RefreshCw, GitBranch, Code, Trash2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const GitHubRepoSelector: React.FC = () => {
  const { authState, repositories, currentRepo, currentBranch, availableBranches, 
          isLoading, fetchRepositories, selectRepository, selectBranch, syncRepoToFileSystem } = useGitHub();
  const { refreshFiles, isLoading: fileSystemLoading, deleteAllFiles } = useFileSystem();
  
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // Track the last sync attempt time to prevent rapid clicking
  const lastSyncAttemptRef = useRef(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncCooldownMs = 10000; // 10 seconds cooldown
  
  // Debug logs
  useEffect(() => {
    console.log('GitHubRepoSelector - Auth state:', authState);
    console.log('GitHubRepoSelector - Repos count:', repositories.length);
    console.log('GitHubRepoSelector - Current repo:', currentRepo?.full_name);
    console.log('GitHubRepoSelector - Current branch:', currentBranch);
    console.log('GitHubRepoSelector - Branches count:', availableBranches.length);
    console.log('GitHubRepoSelector - Loading states:', { isLoading, fileSystemLoading, isSyncing });
  }, [authState, repositories, currentRepo, currentBranch, availableBranches, isLoading, fileSystemLoading, isSyncing]);
  
  // Fetch repositories when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.token && repositories.length === 0) {
      console.log('GitHubRepoSelector - Fetching repositories...');
      fetchRepositories();
    }
  }, [authState.isAuthenticated, authState.token, repositories.length, fetchRepositories]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  if (!authState.isAuthenticated) {
    return null;
  }

  const handleRepositoryChange = async (repoFullName: string) => {
    // Reset sync error when changing repositories
    setSyncError(null);
    
    console.log('GitHubRepoSelector - Repository selected:', repoFullName);
    const repo = repositories.find(r => r.full_name === repoFullName);
    if (repo) {
      await selectRepository(repo);
    }
  };

  const handleBranchChange = async (branch: string) => {
    // Reset sync error when changing branches
    setSyncError(null);
    
    console.log('GitHubRepoSelector - Branch selected:', branch);
    await selectBranch(branch);
  };

  const handleSync = async () => {
    if (!currentRepo || !currentBranch) {
      console.error('GitHubRepoSelector - Cannot sync: missing repo or branch');
      setSyncError('No repository or branch selected');
      return;
    }
    
    // Prevent multiple rapid sync attempts with a cooldown
    const now = Date.now();
    if (now - lastSyncAttemptRef.current < syncCooldownMs) {
      console.log('GitHubRepoSelector - Sync attempted too quickly, debouncing...');
      setSyncError(`Please wait ${syncCooldownMs / 1000} seconds between sync attempts`);
      return;
    }
    
    // Don't allow if already syncing
    if (isSyncing) {
      console.log('GitHubRepoSelector - Already syncing, ignoring request');
      return;
    }
    
    // Reset error state
    setSyncError(null);
    lastSyncAttemptRef.current = now;
    
    // Set syncing state
    setIsSyncing(true);
    
    try {
      // First delete all existing files
      console.log('GitHubRepoSelector - Deleting all existing files before syncing...');
      await deleteAllFiles();
      
      // Then sync the new repository
      const [owner, repo] = currentRepo.full_name.split('/');
      console.log(`GitHubRepoSelector - Syncing repository ${owner}/${repo} (${currentBranch})...`);
      const result = await syncRepoToFileSystem(owner, repo, currentBranch);
      
      // Check boolean result
      if (result === true) {
        console.log('GitHubRepoSelector - Sync successful');
        
        // Wait for a moment to ensure database operations are complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          console.log('GitHubRepoSelector - Refreshing files after sync...');
          await refreshFiles();
          console.log('GitHubRepoSelector - Files refresh completed after sync');
          
          // Close dialog on success
          setIsSyncDialogOpen(false);
        } catch (error) {
          console.error('GitHubRepoSelector - Error during refresh after sync:', error);
          setSyncError('Error refreshing files');
        }
      } else {
        console.error('GitHubRepoSelector - Sync failed or no files were created');
        setSyncError('Sync failed or no files were created');
      }
    } catch (error: any) {
      console.error('GitHubRepoSelector - Error in sync process:', error);
      setSyncError(error.message || 'Unknown error during sync');
    } finally {
      setIsSyncing(false);
      
      // Set a timeout to allow syncing again after the cooldown
      syncTimeoutRef.current = setTimeout(() => {
        console.log('GitHubRepoSelector - Sync cooldown complete');
      }, syncCooldownMs);
    }
  };

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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Repository</label>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    console.log('GitHubRepoSelector - Manually refreshing repositories');
                    fetchRepositories();
                  }}
                  disabled={isLoading}
                  title="Refresh repositories"
                >
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                </Button>
              </div>
              <Select 
                onValueChange={handleRepositoryChange} 
                value={currentRepo?.full_name || ''}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a repository" />
                </SelectTrigger>
                <SelectContent>
                  {repositories.length === 0 && !isLoading && (
                    <SelectItem value="no-repos" disabled>
                      No repositories found
                    </SelectItem>
                  )}
                  {repositories.map((repo) => (
                    <SelectItem key={repo.id} value={repo.full_name}>
                      {repo.full_name} {repo.private ? '(Private)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentRepo && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Branch
                </label>
                <Select 
                  onValueChange={handleBranchChange} 
                  value={currentBranch || ''}
                  disabled={isLoading || !availableBranches.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBranches.length === 0 && !isLoading && (
                      <SelectItem value="no-branches" disabled>
                        No branches found
                      </SelectItem>
                    )}
                    {availableBranches.map((branch) => (
                      <SelectItem key={branch.name} value={branch.name}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Show sync error if any */}
          {syncError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{syncError}</AlertDescription>
            </Alert>
          )}
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
      
      <Dialog open={isSyncDialogOpen} onOpenChange={(open) => {
        // Only allow closing the dialog if not syncing
        if (!isSyncing) {
          setIsSyncDialogOpen(open);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Project Files with Repository</DialogTitle>
            <DialogDescription>
              This will <strong>replace all existing files</strong> in your workspace with files from <strong>{currentRepo?.full_name}</strong> branch <strong>{currentBranch}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {syncError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{syncError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('GitHubRepoSelector - Sync dialog canceled');
                setIsSyncDialogOpen(false);
              }} 
              disabled={isSyncing}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                console.log('GitHubRepoSelector - Sync operation started');
                handleSync();
              }}
              disabled={isSyncing || isLoading || fileSystemLoading}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Replacing Files...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Replace All Files
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
