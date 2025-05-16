
import { useState, useCallback } from 'react';
import { useProjectAnalysis } from './useProjectAnalysis';

type CommandHandler = (args: string) => Promise<string>;

/**
 * Hook for handling chat commands
 */
export const useChatCommands = () => {
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const { scanProject } = useProjectAnalysis();

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
        '/help': async () => {
          return `
Available commands:
/scan-shared-project - Scan and index a project in the shared folder
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
  }, [scanProject]);

  return {
    processCommand,
    isProcessingCommand
  };
};
