
import React from 'react';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import { GitBranch } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { GitHubBranch } from '@/types/github';
import { GitHubBranchItem } from './GitHubBranchItem';

interface BranchSelectorProps {
  branches: GitHubBranch[];
  currentBranch: string | null;
  isLoading: boolean;
  isFetchingBranches: boolean;
  onBranchChange: (branch: string) => void;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  branches,
  currentBranch,
  isLoading,
  isFetchingBranches,
  onBranchChange,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Branch
        </label>
        {isFetchingBranches && (
          <Loader2 size={16} className="animate-spin" />
        )}
      </div>
      <Select 
        onValueChange={onBranchChange} 
        value={currentBranch || ''}
        disabled={isLoading || isFetchingBranches || !branches || branches.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a branch" />
        </SelectTrigger>
        <SelectContent>
          {(!branches || branches.length === 0) && !isLoading && !isFetchingBranches && (
            <SelectItem value="no-branches" disabled>
              No branches found
            </SelectItem>
          )}
          {isFetchingBranches && (
            <SelectItem value="loading-branches" disabled>
              Loading branches...
            </SelectItem>
          )}
          {branches && branches.map((branch) => (
            <GitHubBranchItem key={branch.name} branch={branch} />
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
