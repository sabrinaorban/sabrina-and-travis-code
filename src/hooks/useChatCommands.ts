
import { useState, useCallback } from 'react';
import { useProjectAnalysis } from './useProjectAnalysis';
import { useTravisFileOperations, FileOperationResult } from './useTravisFileOperations';
import { Message } from '@/types';

type CommandHandler = (args: string) => Promise<string>;

/**
 * Hook for handling chat commands
 */
export const useChatCommands = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const { scanProject } = useProjectAnalysis();
  const { readFile, writeFile, listFiles } = useTravisFileOperations(setMessages);

  /**
   * Process a command from the chat input
   */
  const processCommand = useCallback(async (input: string): Promise<{
    isCommand: boolean;
    response: string;
  }> => {
    // Check if this is a command (starts with /)
    if (!input.startsWith('/')) {
      return { isCommand: false, response: '' };
    }
    
    setIsProcessingCommand(true);
    
    try {
      // Parse command and arguments
      const parts = input.split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');
      
      // Command handlers
      const handlers: Record<string, CommandHandler> = {
        '/scan-shared-project': async () => {
          const success = await scanProject();
          return success 
            ? 'Project scan complete! I now have contextual understanding of the codebase.'
            : 'Failed to scan the project. Please ensure the shared folder exists and try again.';
        },
        
        '/read-file': async (filePath) => {
          if (!filePath) return 'Please provide a file path to read.';
          
          const result = await readFile(filePath);
          if (!result.success) {
            return `Failed to read file: ${result.message}`;
          }
          
          return `File content from ${filePath}:\n\n\`\`\`\n${result.content}\n\`\`\``;
        },
        
        '/write-file': async (args) => {
          // Parse arguments: first arg is filePath, rest is content
          // Format: /write-file path/to/file.txt This is the content
          const argParts = args.split(' ');
          if (argParts.length < 2) {
            return 'Please provide both a file path and content to write.';
          }
          
          const filePath = argParts[0];
          const content = argParts.slice(1).join(' ');
          
          const result = await writeFile(filePath, content, true);
          if (!result.success) {
            return `Failed to write file: ${result.message}`;
          }
          
          return `Successfully wrote ${content.length} characters to ${filePath}.`;
        },
        
        '/list-files': async () => {
          const files = await listFiles();
          if (files.length === 0) {
            return 'No files found in the shared folder.';
          }
          
          return `Files in shared folder:\n\n${files.map(file => `- ${file}`).join('\n')}`;
        },
        
        '/help': async () => {
          return `
Available commands:
/scan-shared-project - Scan and index a project in the shared folder
/read-project-context [path] - Analyze and summarize project architecture
/refactor-file [path] - Suggest improvements for a specific file
/read-file [path] - Read a file from the shared folder
/write-file [path] [content] - Write content to a file in the shared folder
/list-files - List all files in the shared folder
/help - Show this help message
          `.trim();
        }
      };
      
      // Execute command if it exists
      if (handlers[command]) {
        const response = await handlers[command](args);
        return { isCommand: true, response };
      }
      
      // Unknown command
      return { 
        isCommand: true, 
        response: `Unknown command: ${command}\nType /help to see available commands.` 
      };
    } catch (error) {
      console.error('Error processing command:', error);
      return { 
        isCommand: true, 
        response: `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    } finally {
      setIsProcessingCommand(false);
    }
  }, [scanProject, readFile, writeFile, listFiles]);

  return {
    processCommand,
    isProcessingCommand
  };
};
