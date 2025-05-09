
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileEntry } from '../types';
import { buildFileTree } from '../utils/fileSystemUtils';

export const useFileFetcher = (user: any) => {
  const [isLoading, setIsLoading] = useState(false);

  // Fetch files from Supabase
  const fetchFiles = async (): Promise<FileEntry[]> => {
    if (!user) {
      return [];
    }
    
    setIsLoading(true);
    try {
      // Fetch files from Supabase for current user
      const { data, error } = await supabase
        .from('files')
        .select('id, name, path, type, content, last_modified, is_modified')
        .eq('user_id', user.id)
        .order('path', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      console.log('Fetched files:', data?.length);
      
      // Convert to FileEntry array and build file tree
      const flatFiles: FileEntry[] = data?.map(file => ({
        id: file.id,
        name: file.name,
        path: file.path,
        type: file.type,
        content: file.content,
        lastModified: file.last_modified,
        isModified: file.is_modified || false, // Load modification status
      })) || [];
      
      // Build file tree
      return buildFileTree(flatFiles);
    } catch (error: any) {
      console.error('Error fetching files:', error.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return { fetchFiles, isLoading, setIsLoading };
};
