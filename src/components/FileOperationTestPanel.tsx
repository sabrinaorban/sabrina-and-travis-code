
import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Check, X, AlertTriangle, FileWarning } from 'lucide-react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useFileMonitor } from '../hooks/useFileMonitor';
import { testFileSystemOperations } from '../services/chat/EnhancedFileOperationService';
import { useToast } from '@/hooks/use-toast';

/**
 * Panel for testing file system operations and monitoring results
 */
export const FileOperationTestPanel: React.FC = () => {
  const { fileSystem, refreshFiles } = useFileSystem();
  const { isActive, toggleMonitor } = useFileMonitor();
  const { toast } = useToast();
  
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    passed: boolean;
    message: string;
  }> | null>(null);
  
  const runTests = useCallback(async () => {
    if (isRunningTests) return;
    
    setIsRunningTests(true);
    toast({
      title: 'Starting File System Tests',
      description: 'Running comprehensive tests on file operations...',
    });
    
    try {
      const { success, results } = await testFileSystemOperations(fileSystem);
      setTestResults(results);
      
      toast({
        title: success ? 'All Tests Passed' : 'Some Tests Failed',
        description: `${results.filter(r => r.passed).length} of ${results.length} tests completed successfully.`,
        variant: success ? 'default' : 'destructive',
      });
      
      // Refresh files to ensure we see the updated file system
      await refreshFiles();
    } catch (error) {
      console.error('Error running file system tests:', error);
      toast({
        title: 'Test Error',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setIsRunningTests(false);
    }
  }, [fileSystem, isRunningTests, refreshFiles, toast]);
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          File System Operation Tests
          <Button 
            size="sm" 
            variant={isActive ? "default" : "outline"} 
            onClick={toggleMonitor}
          >
            {isActive ? 'Monitoring Active' : 'Monitoring Disabled'}
          </Button>
        </CardTitle>
        <CardDescription>
          Test and monitor Travis's file operation capabilities
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Safety Monitoring</AlertTitle>
            <AlertDescription>
              Tests will create and delete temporary files in a test folder.
              The monitoring system prevents unintended deletion of important files.
            </AlertDescription>
          </Alert>
          
          {testResults && (
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-md flex items-start ${
                      result.passed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="mr-3 mt-0.5">
                      {result.passed ? (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{result.test}</div>
                      <div className="text-sm opacity-90">{result.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {!testResults && !isRunningTests && (
            <div className="text-center py-8">
              <FileWarning className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Run tests to verify Travis's file system capabilities
              </p>
            </div>
          )}
          
          {isRunningTests && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={refreshFiles}
        >
          Refresh Files
        </Button>
        <Button 
          onClick={runTests} 
          disabled={isRunningTests}
        >
          {isRunningTests ? 'Running Tests...' : 'Run File Tests'}
        </Button>
      </CardFooter>
    </Card>
  );
};
