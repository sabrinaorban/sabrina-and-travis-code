
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
  const refreshFiles = async (): Promise<void> => {
    if (!user) return;
    
    console.log('Refreshing files for user:', user.id);
    setIsLoading(true);
    setLastRefreshTime(Date.now());
    
    try {
      const files = await fetchFiles();
      console.log('Fetched files:', files ? (Array.isArray(files) ? files.length : 'non-array result') : 0);
      
      // Only update files if we received an array
      if (files && Array.isArray(files)) {
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
      }
      
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
  const deleteAllFiles = async (): Promise<void> => {
    if (!user) return;
    
    console.log('Deleting all files for user:', user.id);
    setIsLoading(true);
    try {
      // Check for and delete all problematic files if they exist
      const PROBLEMATIC_FILES = ['index.file'];
      
      for (const problematicFile of PROBLEMATIC_FILES) {
        const { data: problematicFiles } = await supabase
          .from('files')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', problematicFile);
          
        if (problematicFiles && problematicFiles.length > 0) {
          console.log(`Found ${problematicFiles.length} problematic ${problematicFile} files, deleting them specifically`);
          await supabase
            .from('files')
            .delete()
            .in('id', problematicFiles.map(f => f.id));
        }
      }
      
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
  };

  // Helper function to get modified files
  const getModifiedFiles = (): FileEntry[] => {
    const modifiedFiles: FileEntry[] = [];
    
    const findModifiedFiles = (files: FileEntry[]): void => {
      for (const file of files) {
        if (file.type === 'file' && file.isModified) {
          modifiedFiles.push(file);
        }
        
        if (file.type === 'folder' && file.children) {
          findModifiedFiles(file.children);
        }
      }
    };
    
    findModifiedFiles(fileSystem.files);
    return modifiedFiles;
  };

  return { refreshFiles, deleteAllFiles, lastRefreshTime, getModifiedFiles };
};
