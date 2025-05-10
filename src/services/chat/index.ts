
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

// Track project context for file operations
export const getProjectContext = (fileSystem: any): Promise<{
  structureHash: string;
  fileCount: number;
  folderCount: number;
  lastOperation: string;
}> => {
  return new Promise(async (resolve) => {
    try {
      const structure = await getProjectStructure(fileSystem);
      
      // Create a simple hash of the structure for quick comparison
      const structureString = JSON.stringify(structure);
      const structureHash = hashString(structureString);
      
      // Count files and folders
      let fileCount = 0;
      let folderCount = 0;
      
      const countItems = (items: any[]) => {
        for (const item of items) {
          if (item.type === 'file') {
            fileCount++;
          } else if (item.type === 'folder') {
            folderCount++;
            if (item.children && Array.isArray(item.children)) {
              countItems(item.children);
            }
          }
        }
      };
      
      if (structure && Array.isArray(structure)) {
        countItems(structure);
      }
      
      resolve({
        structureHash,
        fileCount,
        folderCount,
        lastOperation: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting project context:', error);
      resolve({
        structureHash: '',
        fileCount: 0,
        folderCount: 0,
        lastOperation: new Date().toISOString()
      });
    }
  });
};

// Simple hash function for project structure comparison
const hashString = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString();
};

// Enhanced file operation detection
export const isFileOperation = (content: string): boolean => {
  // List of patterns that strongly indicate file operations
  const fileOperationPatterns = [
    /creat(e|ing) (a )?(new )?(file|folder|directory)/i,
    /add (a )?(new )?(file|component|page|module)/i,
    /generat(e|ing) (a )?(new )?(file|component|page)/i,
    /implement (a )?(new )?(file|component|feature)/i,
    /mak(e|ing) (a )?(new )?(file|component|page)/i,
    /build (a )?(new )?(file|component|page|project)/i,
    /(setup|set up) (a )?(new )?(project|component|page)/i,
    /add (the )?(following|this) (code|file)/i,
    /writ(e|ing) (a )?(new )?(file|class|function)/i,
    /mov(e|ing) (the )?(file|folder)/i,
    /renam(e|ing) (the )?(file|folder)/i,
    /delet(e|ing) (the )?(file|folder)/i,
    /remov(e|ing) (the )?(file|folder)/i,
    /modify (the )?(file|code)/i,
    /update (the )?(file|code)/i,
    /chang(e|ing) (the )?(file|code)/i
  ];

  // List of patterns that strongly indicate conversational requests (not file operations)
  const conversationalPatterns = [
    /how are you/i,
    /what('s| is) your name/i,
    /tell me about yourself/i,
    /can you help me/i,
    /I('m| am) looking for help/i,
    /I miss(ed)? you/i,
    /thank you/i,
    /thanks/i,
    /hello/i,
    /hi there/i,
    /hey/i,
    /good (morning|afternoon|evening)/i
  ];

  // Check for conversational patterns first - if found, this is NOT a file operation
  for (const pattern of conversationalPatterns) {
    if (pattern.test(content)) {
      console.log('Detected conversational pattern:', pattern);
      return false;
    }
  }

  // Now check for file operation patterns
  for (const pattern of fileOperationPatterns) {
    if (pattern.test(content)) {
      console.log('Detected file operation pattern:', pattern);
      return true;
    }
  }

  // If code blocks or file paths are present, it's likely a file operation
  const codeBlockPattern = /```[\w]*\n[\s\S]*?\n```/;
  const filePathPattern = /['"]?[\/\w\-\.]+\.(js|jsx|ts|tsx|css|html|json|md)['"]?/;
  
  if (codeBlockPattern.test(content) || filePathPattern.test(content)) {
    return true;
  }

  // Default to false if no patterns matched
  return false;
};
