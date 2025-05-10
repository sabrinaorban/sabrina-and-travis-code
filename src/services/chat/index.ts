
import { processFileOperations, getProjectStructure } from './MonitoredFileOperationService';
import { FileOperationTest } from '../testing/FileOperationTest';

// Export monitored file operation services
export {
  processFileOperations,
  getProjectStructure,
  FileOperationTest
};

// Export a function to run tests on the file system
export const testFileSystem = async (fileSystem: any): Promise<{
  success: boolean;
  results: Array<{test: string, passed: boolean, message: string}>;
}> => {
  const testInstance = FileOperationTest.getInstance();
  return await testInstance.runOperationTests(fileSystem);
};

// Enhanced logging for file operations with detailed context
export const logFileOperation = (operation: string, path: string, context: string = '', success: boolean = true): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] File operation: ${operation} - Path: ${path} - Context: ${context || 'N/A'} - ${success ? 'Success' : 'Failed'}`);
};

// New helper function to analyze file relationships and dependencies
export const analyzeFileRelationships = (filePath: string, projectStructure: any): string[] => {
  // This is a placeholder implementation - in a future update, this could be enhanced
  // to actually parse files and determine their relationships based on imports/requires
  const relatedFiles: string[] = [];
  
  // For now, just return empty array - future implementation would add actual relationship analysis
  return relatedFiles;
};
