
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileEntry } from '../types';
import { buildFileTree } from '../utils/fileSystemUtils';

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
      
      // Check for and delete problematic index.file if it exists
      const { data: indexFile } = await supabase
        .from('files')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', 'index.file')
        .maybeSingle();
        
      if (indexFile) {
        console.log('Found problematic index.file, deleting it:', indexFile.id);
        await supabase
          .from('files')
          .delete()
          .eq('id', indexFile.id);
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
      
      // Convert to FileEntry array and build file tree
      const flatFiles: FileEntry[] = data.map(file => ({
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
