
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

// New helper function to log file system actions with a timestamp
export const logFileOperation = (operation: string, path: string, success: boolean = true): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] File operation: ${operation} - Path: ${path} - ${success ? 'Success' : 'Failed'}`);
};
