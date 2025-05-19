
import { useCallback, useState } from 'react';
import { Message, SelfTool } from '@/types';
import { useChatTools as useBaseChatTools } from '@/hooks/useChatTools';

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
    isProcessing
  };
};
