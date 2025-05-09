
import React, { createContext, useState, useContext, useEffect } from 'react';
import { FileEntry, FileSystemState } from '../types';
import { FileSystemContextType } from '../types/fileSystem';
import { useAuth } from './AuthContext';
import { useFileFetcher } from '../hooks/useFileFetcher';
import { useFileOperations } from '../hooks/useFileOperations';
import { supabase } from '../lib/supabase';

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
      
      // Preserve modification flags when refreshing
      const updatedFiles = files.map(newFile => {
        const existingFile = fileSystem.files.find(f => f.id === newFile.id);
        if (existingFile && existingFile.isModified) {
          return {
            ...newFile,
            isModified: true,
            lastModified: existingFile.lastModified
          };
        }
        return newFile;
      });
      
      setFileSystem(prev => ({
        files: updatedFiles,
        selectedFile: prev.selectedFile && updatedFiles.find(f => f.id === prev.selectedFile?.id) || null
      }));
      
      console.log('Files refreshed:', updatedFiles.length);
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
    
    // Mark file as modified
    setFileSystem(prev => ({
      ...prev,
      files: prev.files.map(file => {
        if (file.id === id) {
          return {
            ...file,
            isModified: true,
            lastModified: Date.now()
          };
        }
        return file;
      })
    }));
  };

  // Delete a file wrapper
  const deleteFile = async (id: string) => {
    return deleteFileOp(id, fileSystem.files);
  };

  // Delete all files - implementation for replacement of repository files
  const deleteAllFiles = async () => {
    if (!user) return Promise.resolve();
    
    setIsLoading(true);
    try {
      // Delete all files from the Supabase database
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('user_id', user.id);
        
      if (error) {
        throw error;
      }
      
      // Reset local file system state
      setFileSystem({
        files: [],
        selectedFile: null
      });
      
      console.log('All files deleted');
    } catch (error) {
      console.error('Error deleting all files:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
    return Promise.resolve();
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
  
  // Get file content by path
  const getFileContentByPath = (path: string): string | null => {
    const file = getFileByPath(path, fileSystem.files);
    return file && file.type === 'file' ? file.content || null : null;
  };
  
  // Update file by path
  const updateFileByPath = async (path: string, content: string): Promise<void> => {
    const file = getFileByPath(path, fileSystem.files);
    
    if (!file || file.type !== 'file') {
      throw new Error(`File not found at path: ${path}`);
    }
    
    await updateFileOp(file.id, content, fileSystem.files, setFileSystem);
    
    // Mark file as modified after path update
    setFileSystem(prev => ({
      ...prev,
      files: prev.files.map(f => {
        if (f.id === file.id) {
          return {
            ...f,
            isModified: true,
            lastModified: Date.now()
          };
        }
        return f;
      })
    }));
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
        getFileContentByPath,
        updateFileByPath,
        isLoading,
        refreshFiles,
        deleteAllFiles
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
