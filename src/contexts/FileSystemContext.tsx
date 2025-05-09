
import React, { createContext, useState, useContext, useEffect } from 'react';
import { FileEntry, FileSystemState } from '../types';
import { FileSystemContextType } from '../types/fileSystem';
import { useAuth } from './AuthContext';
import { useFileFetcher } from '../hooks/useFileFetcher';
import { useFileOperations } from '../hooks/useFileOperations';

const FileSystemContext = createContext<FileSystemContextType | null>(null);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fileSystem, setFileSystem] = useState<FileSystemState>({
    files: [],
    selectedFile: null
  });
  
  const { user } = useAuth();
  const { fetchFiles, isLoading, setIsLoading } = useFileFetcher(user);
  
  // Refresh files function - needs to be defined before useFileOperations
  const refreshFiles = async () => {
    if (!user) return Promise.resolve();
    
    setIsLoading(true);
    try {
      const files = await fetchFiles();
      
      setFileSystem({
        files,
        selectedFile: null
      });
      
      console.log('Files refreshed:', files.length);
    } catch (error) {
      // Error handling is done in fetchFiles
      // Initialize with empty file system on error
      setFileSystem({
        files: [],
        selectedFile: null
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
    return Promise.resolve();
  };
  
  const { getFileByPath, createFile: createFileOp, createFolder: createFolderOp, 
          updateFile: updateFileOp, deleteFile: deleteFileOp } = useFileOperations(user, refreshFiles);

  // Load files from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      refreshFiles();
    }
  }, [user]);

  // Create a file wrapper
  const createFile = async (path: string, name: string, content: string = '') => {
    await createFileOp(path, name, content, fileSystem.files);
  };

  // Create a folder wrapper
  const createFolder = async (path: string, name: string) => {
    await createFolderOp(path, name, fileSystem.files);
  };

  // Update a file wrapper
  const updateFile = async (id: string, content: string) => {
    await updateFileOp(id, content, fileSystem.files, setFileSystem);
  };

  // Delete a file wrapper
  const deleteFile = async (id: string) => {
    return deleteFileOp(id, fileSystem.files);
  };

  // Select a file for viewing/editing
  const selectFile = (file: FileEntry | null) => {
    setFileSystem(prev => ({
      ...prev,
      selectedFile: file
    }));
  };

  // Get file by path wrapper
  const getFileByPathWrapper = (path: string): FileEntry | null => {
    return getFileByPath(path, fileSystem.files);
  };

  return (
    <FileSystemContext.Provider
      value={{
        fileSystem,
        createFile,
        createFolder,
        updateFile,
        deleteFile,
        selectFile,
        getFileByPath: getFileByPathWrapper,
        isLoading,
        refreshFiles
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
};

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (context === null) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};
