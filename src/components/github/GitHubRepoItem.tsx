
import React from 'react';
import { GitHubRepo } from '@/types/github';
import { SelectItem } from '@/components/ui/select';

interface GitHubRepoItemProps {
  repo: GitHubRepo;
}

export const GitHubRepoItem: React.FC<GitHubRepoItemProps> = ({ repo }) => {
  return (
    <SelectItem key={repo.id} value={repo.full_name}>
      {repo.full_name} {repo.private ? '(Private)' : ''}
    </SelectItem>
  );
};
