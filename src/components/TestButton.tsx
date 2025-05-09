
import React from 'react';
import { Button } from './ui/button';
import { useFileSystem } from '../contexts/FileSystemContext';
import { testFileSystem } from '../services/chat';
import { useToast } from '@/hooks/use-toast';

/**
 * A simple button component to run file system tests
 */
export const TestButton: React.FC = () => {
  const { fileSystem, refreshFiles } = useFileSystem();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = React.useState(false);
  
  const runTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    toast({
      title: 'Running File System Tests',
      description: 'Testing file operations...',
    });
    
    try {
      const { success, results } = await testFileSystem(fileSystem);
      
      // Update UI with test results
      const passedTests = results.filter(r => r.passed).length;
      const totalTests = results.length;
      
      toast({
        title: success ? 'Tests Passed' : 'Tests Failed',
        description: `${passedTests}/${totalTests} tests passed. See console for details.`,
        variant: success ? 'default' : 'destructive',
      });
      
      // Log detailed results to console
      console.log('File system test results:', results);
      
      // Refresh files to ensure we see any changes
      await refreshFiles();
    } catch (error) {
      console.error('Error running tests:', error);
      toast({
        title: 'Test Error',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <Button 
      onClick={runTests}
      disabled={isRunning}
      variant="outline"
      className="relative"
    >
      {isRunning ? 'Testing...' : 'Test File System'}
    </Button>
  );
};
