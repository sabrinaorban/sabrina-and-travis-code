
import React from 'react';
import { GitHubBranch } from '@/types/github';
import { SelectItem } from '@/components/ui/select';

interface GitHubBranchItemProps {
  branch: GitHubBranch;
}

export const GitHubBranchItem: React.FC<GitHubBranchItemProps> = ({ branch }) => {
  return (
    <SelectItem key={branch.name} value={branch.name}>
      {branch.name}
    </SelectItem>
  );
};
