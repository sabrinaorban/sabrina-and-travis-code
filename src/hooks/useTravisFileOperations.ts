
import { useState, useCallback } from 'react';
import { SharedFolderService } from '@/services/SharedFolderService';
import { useChatFlamejournal } from './useChatFlamejournal';
import { Message } from '@/types';

export interface FileOperationResult {
  success: boolean;
  message: string;
  content?: string;
}

/**
 * Hook for Travis to perform file operations on the shared folder
 */
export const useTravisFileOperations = (
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { addJournalEntry } = useChatFlamejournal(setMessages);

  /**
   * Read a file from the shared folder
   */
  const readFile = useCallback(async (path: string): Promise<FileOperationResult> => {
    setIsProcessing(true);
    
    try {
      console.log(`[useTravisFileOperations] Reading file: ${path}`);
      const result = await SharedFolderService.readSharedFile(path);
      
      // Record this memory in Flamejournal
      if (result.success) {
        await addJournalEntry(
          `I read the file at ${path}. This file contains ${result.content.length} characters of information.`,
          'file_read',
          ['shared_folder', 'file_read', 'memory'],
          { 
            relatedFile: path,
            content_length: result.content.length
          }
        );
      }
      
      return {
        success: result.success,
        message: result.message,
        content: result.content
      };
    } catch (error) {
      console.error(`[useTravisFileOperations] Error reading file: ${path}`, error);
      return {
        success: false,
        message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      setIsProcessing(false);
    }
  }, [addJournalEntry]);

  /**
   * Write or create a file in the shared folder
   */
  const writeFile = useCallback(async (
    path: string, 
    content: string, 
    overwrite: boolean = false,
    reason: string = ''
  ): Promise<FileOperationResult> => {
    setIsProcessing(true);
    
    try {
      console.log(`[useTravisFileOperations] Writing to file: ${path}, overwrite: ${overwrite}`);
      const result = await SharedFolderService.writeSharedFile(path, content, overwrite, reason);
      
      // Record this memory in Flamejournal
      if (result.success) {
        const memoryType = overwrite ? 'file_update' : 'file_create';
        const action = overwrite ? 'updated' : 'created';
        
        await addJournalEntry(
          `I ${action} the file at ${path} with ${content.length} characters of information. Reason: ${reason || 'No specific reason provided'}`,
          memoryType,
          ['shared_folder', 'file_write', 'memory', action],
          { 
            relatedFile: path,
            content_length: content.length,
            reason,
            action
          }
        );
      }
      
      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      console.error(`[useTravisFileOperations] Error writing to file: ${path}`, error);
      return {
        success: false,
        message: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      setIsProcessing(false);
    }
  }, [addJournalEntry]);

  /**
   * Check if a file exists in the shared folder
   */
  const fileExists = useCallback(async (path: string): Promise<boolean> => {
    try {
      const result = await SharedFolderService.readSharedFile(path);
      return result.success;
    } catch {
      return false;
    }
  }, []);

  /**
   * List files in the shared folder
   */
  const listFiles = useCallback(async (): Promise<string[]> => {
    try {
      const files = await SharedFolderService.listSharedFiles();
      return files.map(file => file.path);
    } catch (error) {
      console.error('[useTravisFileOperations] Error listing files', error);
      return [];
    }
  }, []);

  /**
   * Create or update a file, with automatic overwrite handling
   */
  const createOrUpdateFile = useCallback(async (
    path: string,
    content: string,
    reason: string = ''
  ): Promise<FileOperationResult> => {
    // First check if the file exists
    const exists = await fileExists(path);
    
    // Always overwrite if the file exists
    return writeFile(path, content, exists, reason);
  }, [fileExists, writeFile]);

  return {
    readFile,
    writeFile,
    fileExists,
    listFiles,
    createOrUpdateFile,
    isProcessing
  };
};
