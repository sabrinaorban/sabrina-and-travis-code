
import { useState } from 'react';
import { FileEntry, FileSystemState } from '../types';
import { supabase } from '../lib/supabase';

export const useFileRefresh = (
  user: any,
  fetchFiles: () => Promise<FileEntry[]>,
  fileSystem: FileSystemState,
  setFileSystem: React.Dispatch<React.SetStateAction<FileSystemState>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  
  // Refresh files function
  const refreshFiles = async () => {
    if (!user) return Promise.resolve();
    
    console.log('Refreshing files for user:', user.id);
    setIsLoading(true);
    setLastRefreshTime(Date.now());
    
    try {
      const files = await fetchFiles();
      console.log('Fetched files:', files.length);
      
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
      
      console.log('Files refreshed successfully:', updatedFiles.length);
      return files;
    } catch (error) {
      console.error('Error refreshing files:', error);
      // Initialize with empty file system on error
      setFileSystem({
        files: [],
        selectedFile: null
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete all files - implementation for replacement of repository files
  const deleteAllFiles = async () => {
    if (!user) return Promise.resolve();
    
    console.log('Deleting all files for user:', user.id);
    setIsLoading(true);
    try {
      // Delete all files from the Supabase database
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Supabase error when deleting files:', error);
        throw error;
      }
      
      // Reset local file system state
      setFileSystem({
        files: [],
        selectedFile: null
      });
      
      console.log('All files deleted successfully');
    } catch (error) {
      console.error('Error deleting all files:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
    return Promise.resolve();
  };

  return { refreshFiles, deleteAllFiles, lastRefreshTime };
};
