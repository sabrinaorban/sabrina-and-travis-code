
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
  
  const { 
    refreshFiles, 
    deleteAllFiles, 
    getModifiedFiles 
  } = useFileRefresh(
    user, 
    fetchFiles, 
    fileSystem, 
    setFileSystem, 
    setIsLoading
  );
  
  const { 
    getFileByPath, 
    createFile, 
    createFolder, 
    updateFile, 
    deleteFile,
    getFileContentByPath,
    updateFileByPath 
  } = useFileOperations(user, refreshFiles);
  
  const { selectFile } = useFileSelection(setFileSystem);

  // Load files when user is authenticated - but only once
  useEffect(() => {
    if (user) {
      // Initial load of files when user is authenticated
      console.log('User authenticated, loading files once');
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
        updateFile: (id: string, content: string) => updateFile(id, content, fileSystem.files),
        deleteFile: (id: string) => deleteFile(id, fileSystem.files),
        selectFile,
        getFileByPath: (path: string) => getFileByPath(path, fileSystem.files),
        getFileContentByPath: (path: string) => getFileContentByPath(path, fileSystem.files),
        updateFileByPath: (path: string, content: string) => updateFileByPath(path, content, fileSystem.files),
        isLoading,
        refreshFiles,
        deleteAllFiles,
        getModifiedFiles: () => getModifiedFiles(fileSystem.files)
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
