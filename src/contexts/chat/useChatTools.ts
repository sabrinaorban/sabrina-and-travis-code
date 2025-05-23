
import { useCallback, useState } from 'react';
import { Message, SelfTool } from '@/types';
import { useChatTools as useBaseChatTools } from '@/hooks/useChatTools';
import { useTravisFileOperations } from '@/hooks/useTravisFileOperations';
import { SharedFolderService } from '@/services/SharedFolderService';

/**
 * Hook for managing tool execution within the chat context
 */
export const useChatTools = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const [isExecuting, setIsExecuting] = useState(false);
  // Import the base hook that contains all the tool functions
  const {
    useTool: baseUseTool,
    reflectOnTool: baseReflectOnTool,
    reviseTool: baseReviseTool,
    generateTool: baseGenerateTool,
    processToolCreation,
    handleToolCommand,
    isProcessing
  } = useBaseChatTools(setMessages);

  // Add file operations
  const { readFile, writeFile, listFiles } = useTravisFileOperations(setMessages);

  /**
   * Execute a tool based on the prompt
   * Returns true if a tool was executed, false otherwise
   */
  const executeTool = useCallback(async (prompt: string): Promise<boolean> => {
    // Check if the prompt contains a tool execution request
    if (!prompt.includes('/tool') && !prompt.includes('use tool')) {
      return false;
    }

    setIsExecuting(true);
    try {
      // Mock tool execution for now
      // This would be replaced with actual tool execution logic
      console.log('Executing tool for prompt:', prompt);
      
      // Add a message to show tool execution
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I executed a tool based on your request. This is a placeholder response.',
        timestamp: new Date().toISOString(),
        emotion: 'helpful'
      }]);
      
      return true;
    } catch (error) {
      console.error('Error executing tool:', error);
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, [setMessages]);

  /**
   * Process a file operation request
   */
  const processFileOperation = useCallback(async (operation: string, filePath: string, content?: string): Promise<boolean> => {
    try {
      console.log('Processing file operation:', { operation, filePath, content });
      
      // Validate the file path is within the shared folder
      if (!SharedFolderService.isPathWithinSharedFolder(filePath)) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I cannot access files outside the shared folder. The path must be within ${SharedFolderService.getSharedFolderPath()}.`,
          timestamp: new Date().toISOString(),
          emotion: 'concerned'
        }]);
        return false;
      }
      
      let result;
      let message = '';
      
      switch (operation) {
        case 'read':
          result = await readFile(filePath);
          if (result.success) {
            message = `I read the file at ${filePath}:\n\n\`\`\`\n${result.content?.substring(0, 500)}${result.content && result.content.length > 500 ? '...' : ''}\n\`\`\``;
          } else {
            message = `I couldn't read the file: ${result.message}`;
          }
          break;
          
        case 'write':
          if (!content) {
            message = 'No content provided for writing to file.';
            break;
          }
          
          result = await writeFile(filePath, content, true);
          if (result.success) {
            message = `I successfully wrote ${content.length} characters to ${filePath}.`;
          } else {
            message = `I couldn't write to the file: ${result.message}`;
          }
          break;
          
        case 'list':
          const files = await listFiles();
          if (files.length > 0) {
            message = `Here are the files in the shared folder:\n\n${files.map(f => `- ${f}`).join('\n')}`;
          } else {
            message = `No files found in the shared folder.`;
          }
          break;
          
        default:
          message = `Unknown file operation: ${operation}`;
          break;
      }
      
      // Add a message to indicate the file operation result
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
        emotion: result?.success ? 'helpful' : 'concerned'
      }]);
      
      return result?.success || false;
    } catch (error) {
      console.error('Error processing file operation:', error);
      
      // Add error message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error processing file operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        emotion: 'concerned'
      }]);
      
      return false;
    }
  }, [readFile, writeFile, listFiles, setMessages]);

  // Create wrapper functions with compatible return types to match ChatContext
  const useTool = useCallback((toolName: string): Promise<SelfTool | null> => {
    return baseUseTool(toolName);
  }, [baseUseTool]);

  const reflectOnTool = useCallback((toolName: string): Promise<{reflection: string, tool: SelfTool | null}> => {
    return baseReflectOnTool(toolName);
  }, [baseReflectOnTool]);

  const reviseTool = useCallback((toolName: string): Promise<{message: string, updatedTool: SelfTool | null}> => {
    return baseReviseTool(toolName);
  }, [baseReviseTool]);

  const generateTool = useCallback((purpose: string): Promise<SelfTool | null> => {
    return baseGenerateTool(purpose);
  }, [baseGenerateTool]);

  return {
    executeTool,
    isExecuting,
    // Expose the wrapped methods
    useTool,
    reflectOnTool,
    reviseTool,
    generateTool,
    // Also expose these from the base hook
    processToolCreation,
    handleToolCommand,
    isProcessing,
    // Add the processFileOperation function
    processFileOperation
  };
};
