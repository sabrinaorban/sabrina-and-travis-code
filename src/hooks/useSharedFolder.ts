
import { useState, useCallback } from 'react';
import { SharedFolderService } from '@/services/SharedFolderService';
import { FileEntry } from '@/types';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for interacting with the shared folder
 */
export const useSharedFolder = () => {
  const { toast } = useToast();
  const { user } = useAuth(); // Get the authenticated user
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);

  /**
   * List all files in the shared folder
   */
  const listFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if user is authenticated
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to access shared files',
          variant: 'destructive',
        });
        return [];
      }

      // Ensure the shared folder exists
      await SharedFolderService.ensureSharedFolderExists();
      
      const sharedFiles = await SharedFolderService.listSharedFiles();
      setFiles(sharedFiles);
      return sharedFiles;
    } catch (error) {
      console.error('Error listing shared files:', error);
      toast({
        title: 'Error',
        description: 'Failed to list shared files',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  /**
   * Read a file from the shared folder
   */
  const readFile = useCallback(async (filePath: string) => {
    setIsLoading(true);
    try {
      // Check if user is authenticated
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to read shared files',
          variant: 'destructive',
        });
        return { content: '', success: false, message: 'Authentication required' };
      }

      const result = await SharedFolderService.readSharedFile(filePath);
      
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error reading shared file:', error);
      toast({
        title: 'Error',
        description: 'Failed to read file',
        variant: 'destructive',
      });
      return { content: '', success: false, message: 'Unexpected error' };
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  /**
   * Write a file to the shared folder
   */
  const writeFile = useCallback(async (filePath: string, content: string, overwrite = false) => {
    setIsLoading(true);
    try {
      // Check if user is authenticated
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to write shared files',
          variant: 'destructive',
        });
        return { success: false, message: 'Authentication required' };
      }

      // Ensure the shared folder exists first
      await SharedFolderService.ensureSharedFolderExists();
      
      const result = await SharedFolderService.writeSharedFile(filePath, content, overwrite);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
      
      // Refresh the file list
      await listFiles();
      
      return result;
    } catch (error) {
      console.error('Error writing shared file:', error);
      toast({
        title: 'Error',
        description: 'Failed to write file',
        variant: 'destructive',
      });
      return { success: false, message: 'Unexpected error' };
    } finally {
      setIsLoading(false);
    }
  }, [toast, user, listFiles]);

  /**
   * Get the shared folder path
   */
  const getSharedFolderPath = useCallback(() => {
    return SharedFolderService.getSharedFolderPath();
  }, []);

  return {
    files,
    isLoading,
    listFiles,
    readFile,
    writeFile,
    getSharedFolderPath
  };
};
