
import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SharedProjectService } from '@/services/SharedProjectService';

/**
 * Hook for analyzing and understanding projects in the shared folder
 */
export const useProjectAnalysis = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{
    totalFiles: number;
    processedFiles: number;
    entryPoints: string[];
    fileTypes: Record<string, number>;
  } | null>(null);

  /**
   * Scan a project in the shared folder
   */
  const scanProject = useCallback(async () => {
    setIsScanning(true);
    try {
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to scan projects',
          variant: 'destructive',
        });
        return false;
      }

      const result = await SharedProjectService.scanProject();

      if (result.success) {
        setScanResults(result.stats);
        toast({
          title: 'Project Scan Complete',
          description: result.message,
        });
        return true;
      } else {
        toast({
          title: 'Project Scan Failed',
          description: result.message,
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error scanning project:', error);
      toast({
        title: 'Error',
        description: 'Failed to scan project',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsScanning(false);
    }
  }, [toast, user]);

  /**
   * Find files related to a specific query
   */
  const findRelatedFiles = useCallback(async (query: string, maxResults = 5) => {
    try {
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to search project files',
          variant: 'destructive',
        });
        return [];
      }

      return await SharedProjectService.findRelatedFiles(query, maxResults);
    } catch (error) {
      console.error('Error finding related files:', error);
      toast({
        title: 'Error',
        description: 'Failed to find related files',
        variant: 'destructive',
      });
      return [];
    }
  }, [toast, user]);

  /**
   * Find where a component is used within the project
   */
  const findComponentUsage = useCallback(async (componentName: string) => {
    try {
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to search for component usage',
          variant: 'destructive',
        });
        return [];
      }

      return await SharedProjectService.findComponentUsage(componentName);
    } catch (error) {
      console.error('Error finding component usage:', error);
      toast({
        title: 'Error',
        description: 'Failed to find component usage',
        variant: 'destructive',
      });
      return [];
    }
  }, [toast, user]);

  /**
   * Clear all stored embeddings
   */
  const clearProjectData = useCallback(async () => {
    try {
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to clear project data',
          variant: 'destructive',
        });
        return false;
      }

      const result = await SharedProjectService.clearEmbeddings();
      
      if (result) {
        setScanResults(null);
        toast({
          title: 'Project Data Cleared',
          description: 'All project embeddings have been removed',
        });
        return true;
      } else {
        toast({
          title: 'Operation Failed',
          description: 'Could not clear project data',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error clearing project data:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear project data',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, user]);

  return {
    scanProject,
    isScanning,
    scanResults,
    findRelatedFiles,
    findComponentUsage,
    clearProjectData
  };
};
