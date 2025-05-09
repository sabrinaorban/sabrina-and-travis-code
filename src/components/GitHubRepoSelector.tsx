
import React, { useState } from 'react';
import { useGitHub } from '@/contexts/GitHubContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Loader2, RefreshCw, GitBranch, Code } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const GitHubRepoSelector: React.FC = () => {
  const { authState, repositories, currentRepo, currentBranch, availableBranches, 
          isLoading, fetchRepositories, selectRepository, selectBranch, syncRepoToFileSystem } = useGitHub();
  const { refreshFiles } = useFileSystem();
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  if (!authState.isAuthenticated) {
    return null;
  }

  const handleRepositoryChange = async (repoFullName: string) => {
    const repo = repositories.find(r => r.full_name === repoFullName);
    if (repo) {
      await selectRepository(repo);
    }
  };

  const handleBranchChange = async (branch: string) => {
    await selectBranch(branch);
  };

  const handleSync = async () => {
    if (!currentRepo || !currentBranch) return;
    
    const [owner, repo] = currentRepo.full_name.split('/');
    await syncRepoToFileSystem(owner, repo, currentBranch);
    await refreshFiles();
    setIsSyncDialogOpen(false);
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
                  onClick={() => fetchRepositories()}
                  disabled={isLoading}
                  title="Refresh repositories"
                >
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                </Button>
              </div>
              <Select 
                onValueChange={handleRepositoryChange} 
                value={currentRepo?.full_name}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a repository" />
                </SelectTrigger>
                <SelectContent>
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
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full"
            disabled={isLoading || !currentRepo || !currentBranch}
            onClick={() => setIsSyncDialogOpen(true)}
          >
            Import Repository Files
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Repository Files</DialogTitle>
            <DialogDescription>
              This will import all files from <strong>{currentRepo?.full_name}</strong> branch <strong>{currentBranch}</strong> into your workspace. Existing files with the same paths will be overwritten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSync}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Files'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
