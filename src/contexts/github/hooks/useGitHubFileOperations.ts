
/**
 * Hook to handle GitHub file operations
 */
export const useGitHubFileOperations = (
  saveFileToRepo: (repoFullName: string, filePath: string, content: string, commitMessage: string, branch: string) => Promise<boolean>,
  currentRepo: any,
  currentBranch: string | null
) => {
  // Create a wrapper for saveFileToRepo to match the expected interface
  const handleSaveFileToRepo = async (
    filePath: string,
    content: string,
    commitMessage: string
  ): Promise<boolean> => {
    if (!currentRepo || !currentBranch) {
      console.error("Cannot save file: No repository or branch selected");
      return false;
    }
    return saveFileToRepo(currentRepo.full_name, filePath, content, commitMessage, currentBranch);
  };

  return {
    handleSaveFileToRepo
  };
};
