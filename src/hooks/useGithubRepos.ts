
import { useGithubOperations } from './github/useGithubOperations';

/**
 * Hook for GitHub repository operations
 * @param token GitHub authentication token
 * @returns GitHub repository operations
 * 
 * @deprecated Use useGithubOperations from './github/useGithubOperations' instead
 */
export const useGithubRepos = (token: string | null) => {
  // Wrap the new hook to maintain backward compatibility
  return useGithubOperations(token);
};
