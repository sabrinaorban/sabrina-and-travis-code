
import { useState } from 'react';
import { FileEntry, FileSystemState } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from './use-toast';

export const useFileFetcher = (user: any | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchFiles = async (): Promise<FileEntry[]> => {
    if (!user) return [];
    
    setIsLoading(true);
    try {
      console.log('Fetching files for user:', user.id);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        throw error;
      }
      
      console.log('Fetched files:', data?.length || 0);
      
      if (data) {
        // Convert flat file list to hierarchical structure
        const fileEntries: FileEntry[] = [];
        const fileMap = new Map<string, FileEntry>();
        
        // First pass: create all file entries
        data.forEach(file => {
          const entry: FileEntry = {
            id: file.id,
            name: file.name,
            path: file.path,
            type: file.type as 'file' | 'folder',
            content: file.content || '',
            lastModified: new Date(file.last_modified).getTime()
          };
          
          if (entry.type === 'folder') {
            entry.children = [];
          }
          
          fileMap.set(entry.path, entry);
        });
        
        // Second pass: organize into hierarchy
        fileMap.forEach(entry => {
          const parentPath = entry.path.substring(0, entry.path.lastIndexOf('/'));
          
          if (parentPath) {
            const parent = fileMap.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(entry);
            } else if (parentPath === '/') {
              // Root-level entries
              fileEntries.push(entry);
            }
          } else {
            // Root-level entries
            fileEntries.push(entry);
          }
        });
        
        return fileEntries;
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load files',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchFiles,
    isLoading,
    setIsLoading
  };
};
