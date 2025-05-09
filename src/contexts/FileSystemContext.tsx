
import React, { createContext, useState, useContext, useEffect } from 'react';
import { FileEntry, FileSystemState } from '../types';
import { FileSystemContextType } from '../types/fileSystem';
import { useAuth } from './AuthContext';
import { useFileFetcher } from '../hooks/useFileFetcher';
import { useFileOperations } from '../hooks/useFileOperations';
import { useFileSelection } from '../hooks/useFileSelection';
import { useFileRefresh } from '../hooks/useFileRefresh';

const FileSystemContext = createContext<FileSystemContextType | null>(null);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fileSystem, setFileSystem] = useState<FileSystemState>({
    files: [],
    selectedFile: null
  });
  
  const { user } = useAuth();
  const { fetchFiles, isLoading, setIsLoading } = useFileFetcher(user);
  
  // Use the refactored hooks
  const { refreshFiles, deleteAllFiles } = useFileRefresh(user, fetchFiles, fileSystem, setFileSystem, setIsLoading);
  
  const { 
    getFileByPath, 
    createFile, 
    createFolder, 
    updateFile, 
    deleteFile,
    getFileContentByPath,
    updateFileByPath 
  } = useFileOperations(user, refreshFiles);
  
  const { selectFile, getModifiedFiles } = useFileSelection(setFileSystem);

  // Load files when user is authenticated
  useEffect(() => {
    if (user) {
      refreshFiles();
    } else {
      // Reset file system when user logs out
      setFileSystem({
        files: [],
        selectedFile: null
      });
    }
  }, [user]);

  return (
    <FileSystemContext.Provider
      value={{
        fileSystem,
        createFile,
        createFolder,
        updateFile,
        deleteFile,
        selectFile,
        getFileByPath: (path) => getFileByPath(path, fileSystem.files),
        getFileContentByPath,
        updateFileByPath,
        isLoading,
        refreshFiles,
        deleteAllFiles,
        getModifiedFiles
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
