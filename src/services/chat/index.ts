
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
