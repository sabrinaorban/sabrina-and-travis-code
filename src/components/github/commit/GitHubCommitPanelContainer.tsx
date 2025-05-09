
import React, { useEffect, useState } from 'react';
import { useGitHub } from '@/contexts/github';
import { GitHubCommitPanel } from '@/components/GitHubCommitPanel';

/**
 * Container component that handles GitHub commit panel visibility
 * and ensures it appears when appropriate GitHub state is available
 */
export const GitHubCommitPanelContainer: React.FC = () => {
  const { authState, currentRepo, currentBranch } = useGitHub();
  
  // Force rerender after GitHub operations
  const [key, setKey] = useState(0);
  
  useEffect(() => {
    // Update the key when GitHub state changes
    setKey(prev => prev + 1);
  }, [authState?.isAuthenticated, currentRepo, currentBranch]);
  
  useEffect(() => {
    console.log('GitHubCommitPanelContainer - State check:', {
      isAuthenticated: authState?.isAuthenticated,
      repoName: currentRepo?.full_name,
      branchName: currentBranch,
      key
    });
  }, [authState?.isAuthenticated, currentRepo, currentBranch, key]);
  
  // Only render when GitHub is authenticated and a repo is selected
  if (!authState?.isAuthenticated || !currentRepo || !currentBranch) {
    console.log('Not rendering GitHub commit panel - missing required state');
    return null;
  }
  
  return (
    <div className="border-t" key={`github-commit-panel-${key}`}>
      <GitHubCommitPanel />
    </div>
  );
};
