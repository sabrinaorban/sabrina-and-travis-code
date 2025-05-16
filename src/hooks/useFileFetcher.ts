import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileEntry } from '../types';
import { buildFileTree } from '../utils/fileSystemUtils';

// List of problematic filenames that should be filtered out
const PROBLEMATIC_FILES = ['index.file'];

export const useFileFetcher = (user: any) => {
  const [isLoading, setIsLoading] = useState(false);

  // Fetch files from Supabase
  const fetchFiles = async (): Promise<FileEntry[]> => {
    if (!user) {
      console.log('No user available, returning empty file array');
      return [];
    }
    
    setIsLoading(true);
    try {
      console.log(`Fetching files for user ${user.id}...`);
      
      // Check for and delete any problematic files if they exist
      for (const problematicFile of PROBLEMATIC_FILES) {
        const { data: problematicFiles, error: findError } = await supabase
          .from('files')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', problematicFile);
          
        if (findError) {
          console.error(`Error checking for ${problematicFile}:`, findError);
          continue;
        }
        
        if (problematicFiles && problematicFiles.length > 0) {
          console.log(`Found ${problematicFiles.length} problematic ${problematicFile} files, deleting them...`);
          
          const { error: deleteError } = await supabase
            .from('files')
            .delete()
            .in('id', problematicFiles.map(f => f.id));
            
          if (deleteError) {
            console.error(`Error deleting ${problematicFile} files:`, deleteError);
          } else {
            console.log(`Successfully deleted ${problematicFiles.length} ${problematicFile} files`);
          }
        }
      }
      
      // Fetch files from Supabase for current user
      const { data, error } = await supabase
        .from('files')
        .select('id, name, path, type, content, last_modified, is_modified')
        .eq('user_id', user.id)
        .order('path', { ascending: true });
        
      if (error) {
        console.error('Supabase error when fetching files:', error);
        throw error;
      }
      
      console.log('Fetched files from database:', data?.length);
      
      // If no files were found, return empty array
      if (!data || data.length === 0) {
        console.log('No files found in database');
        return [];
      }
      
      // Filter out any problematic files that might have been missed
      const filteredFiles = data.filter(file => !PROBLEMATIC_FILES.includes(file.name));
      if (filteredFiles.length !== data.length) {
        console.log(`Filtered out ${data.length - filteredFiles.length} problematic files`);
      }
      
      // Convert to FileEntry array and build file tree
      const flatFiles: FileEntry[] = filteredFiles.map(file => ({
        id: file.id,
        name: file.name,
        path: file.path,
        type: file.type,
        content: file.content,
        lastModified: file.last_modified,
        isModified: file.is_modified || false, // Load modification status
      }));
      
      console.log('Building file tree from', flatFiles.length, 'flat files');
      
      // Build file tree
      const fileTree = buildFileTree(flatFiles);
      console.log('Built file tree with', fileTree.length, 'root items');
      
      return fileTree;
    } catch (error: any) {
      console.error('Error fetching files:', error.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return { fetchFiles, isLoading, setIsLoading };
};
