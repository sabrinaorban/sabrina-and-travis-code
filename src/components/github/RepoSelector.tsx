
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { GitHubRepo } from '@/types/github';
import { GitHubRepoItem } from './GitHubRepoItem';

interface RepoSelectorProps {
  repositories: GitHubRepo[];
  currentRepo: GitHubRepo | null;
  isLoading: boolean;
  isSelecting: boolean;
  fetchRepositories: () => void;
  onRepositoryChange: (repoFullName: string) => void;
}

export const RepoSelector: React.FC<RepoSelectorProps> = ({
  repositories,
  currentRepo,
  isLoading,
  isSelecting,
  fetchRepositories,
  onRepositoryChange,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Repository</label>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            console.log('RepoSelector - Manually refreshing repositories');
            fetchRepositories();
          }}
          disabled={isLoading}
          title="Refresh repositories"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>
      <Select 
        onValueChange={onRepositoryChange} 
        value={currentRepo?.full_name || ''}
        disabled={isLoading || isSelecting}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a repository" />
        </SelectTrigger>
        <SelectContent>
          {(!repositories || repositories.length === 0) && !isLoading && (
            <SelectItem value="no-repos" disabled>
              No repositories found
            </SelectItem>
          )}
          {repositories && repositories.map((repo) => (
            <GitHubRepoItem key={repo.id} repo={repo} />
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
