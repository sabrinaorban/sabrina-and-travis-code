
import { useState, useCallback } from 'react';
import { FileEntry, FileSystemState } from '../types';

export const useFileSelection = (
  setFileSystem: React.Dispatch<React.SetStateAction<FileSystemState>>
) => {
  // Select a file from the file system
  const selectFile = useCallback((file: FileEntry | null) => {
    setFileSystem(prev => ({
      ...prev,
      selectedFile: file
    }));
  }, [setFileSystem]);
  
  // Get all modified files from the file system
  const getModifiedFiles = useCallback((files: FileEntry[]): FileEntry[] => {
    const modifiedFiles: FileEntry[] = [];
    
    const findModifiedFiles = (fileEntries: FileEntry[]): void => {
      for (const file of fileEntries) {
        if (file.type === 'file' && file.isModified) {
          modifiedFiles.push(file);
        }
        
        if (file.type === 'folder' && file.children) {
          findModifiedFiles(file.children);
        }
      }
    };
    
    findModifiedFiles(files);
    return modifiedFiles;
  }, []);

  return { selectFile, getModifiedFiles };
};
