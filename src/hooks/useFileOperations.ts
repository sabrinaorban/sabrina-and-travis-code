
import { FileEntry } from '../types';
import { supabase, generateUUID } from '../lib/supabase';
import { useToast } from './use-toast';
import { findNode, findNodeById } from '../services/utils/FileTreeUtils';
import { useFileCreate } from './useFileCreate';
import { useFileUpdate } from './useFileUpdate';
import { useFileDelete } from './useFileDelete';

// Handles all file system operations
export const useFileOperations = (user: any, refreshFiles: () => Promise<void>) => {
  const { toast } = useToast();
  
  // Using smaller, more focused hooks
  const { createFile, createFolder } = useFileCreate(user, refreshFiles, toast);
  const { updateFile } = useFileUpdate(user, toast);
  const { deleteFile } = useFileDelete(user, refreshFiles, toast);
  
  // Find file by path
  const getFileByPath = (path: string, files: FileEntry[]): FileEntry | null => {
    const { node } = findNode(path, files);
    return node;
  };
  
  // Get file content by path
  const getFileContentByPath = (path: string, files: FileEntry[]): string | null => {
    const file = getFileByPath(path, files);
    return file && file.type === 'file' ? file.content || null : null;
  };
  
  // Update file by path
  const updateFileByPath = async (path: string, content: string, files: FileEntry[]): Promise<void> => {
    const file = getFileByPath(path, files);
    
    if (!file || file.type !== 'file') {
      throw new Error(`File not found at path: ${path}`);
    }
    
    await updateFile(file.id, content, files);
  };

  return {
    getFileByPath,
    createFile,
    createFolder,
    updateFile,
    deleteFile,
    getFileContentByPath,
    updateFileByPath
  };
};
