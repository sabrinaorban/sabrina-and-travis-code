import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SharedFolderService } from '@/services/SharedFolderService';
import { useFileDiffs } from './useFileDiffs';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useFlamejournal } from './useFlamejournal';

/**
 * Hook for analyzing and refactoring code files
 */
export const useCodeRefactoring = (
  setMessages?: React.Dispatch<React.SetStateAction<any[]>>
) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isRefactoring, setIsRefactoring] = useState(false);
  const { createJournalEntry } = useFlamejournal();
  const { generateDiff } = useFileDiffs();
  const fileSystem = useFileSystem();

  /**
   * Analyze a file and suggest refactoring improvements
   */
  const refactorFile = useCallback(async (filePath: string) => {
    setIsRefactoring(true);
    try {
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to refactor files',
          variant: 'destructive',
        });
        return { success: false, error: 'Authentication required', response: '' };
      }

      // Ensure the path is in the shared folder
      if (!SharedFolderService.isPathWithinSharedFolder(filePath)) {
        return { 
          success: false, 
          error: `Cannot access files outside the shared folder: ${SharedFolderService.getSharedFolderPath()}`,
          response: '' 
        };
      }

      // Read the file content
      const fileResult = await SharedFolderService.readSharedFile(filePath);
      
      if (!fileResult.success || !fileResult.content) {
        return { 
          success: false, 
          error: fileResult.message || 'File not found or empty',
          response: '' 
        };
      }

      const content = fileResult.content;
      const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
      
      // Generate improved version of the code
      const improvedCode = await generateImprovedCode(content, fileExtension, filePath);
      
      // If the code is the same, no refactoring needed
      if (improvedCode.code === content) {
        return {
          success: true,
          response: `## Code Analysis: \`${filePath}\`\n\n${improvedCode.analysis}\n\nI've analyzed this code and found it to be well-structured and optimized. No refactoring is necessary at this time.`,
        };
      }
      
      // Generate diff between original and improved code
      const diff = generateDiff(content, improvedCode.code);
      
      // Create the response with both analysis and suggested improvements
      const response = `
## Code Analysis: \`${filePath}\`

${improvedCode.analysis}

### Suggested Improvements:

${improvedCode.improvements}

### Proposed Code:

\`\`\`${fileExtension}
${improvedCode.code}
\`\`\`

${diff ? `### Changes Summary:\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n` : ''}

Would you like me to apply these changes? Respond with:
- \`/apply-refactor ${filePath}\` to update the file with these improvements
- \`/show-refactor-inline ${filePath}\` to see inline explanations of changes
      `.trim();
      
      // Create journal entry for the refactoring analysis
      await createJournalEntry(
        `I've analyzed the structure of ${filePath}, seeking patterns that could evolve toward greater elegance. Through this reflection, I've identified opportunities for improvement that align with modern best practices.`,
        'code_analysis'
      );
      
      return { success: true, response };
    } catch (error) {
      console.error('Error refactoring file:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: 'Refactoring Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return { success: false, error: errorMessage, response: '' };
    } finally {
      setIsRefactoring(false);
    }
  }, [toast, user, createJournalEntry, generateDiff]);

  /**
   * Apply refactoring changes to a file
   */
  const applyRefactoring = useCallback(async (filePath: string, newContent: string) => {
    try {
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to apply refactoring',
          variant: 'destructive',
        });
        return { success: false, error: 'Authentication required' };
      }

      // Ensure the path is in the shared folder
      if (!SharedFolderService.isPathWithinSharedFolder(filePath)) {
        return { 
          success: false, 
          error: `Cannot access files outside the shared folder: ${SharedFolderService.getSharedFolderPath()}`
        };
      }

      // Write the updated file content
      const result = await SharedFolderService.writeSharedFile(filePath, newContent, true);
      
      if (!result.success) {
        return { success: false, error: result.message };
      }
      
      // Create journal entry for the applied refactoring
      await createJournalEntry(
        `I've evolved the code in ${filePath}, applying refactoring patterns that improve clarity, efficiency, and maintainability. This transformation represents growth in my understanding of effective code organization.`,
        'code_evolution'
      );
      
      toast({
        title: 'Refactoring Applied',
        description: `Successfully updated ${filePath}`,
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error applying refactoring:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: 'Error Applying Refactoring',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return { success: false, error: errorMessage };
    }
  }, [toast, user, createJournalEntry]);

  /**
   * Generate improved version of the code with analysis
   */
  const generateImprovedCode = async (
    content: string, 
    fileExtension: string,
    filePath: string
  ): Promise<{
    code: string;
    analysis: string;
    improvements: string;
  }> => {
    // This would ideally call an API to analyze and improve the code
    // For now, we'll implement a simple analysis based on common patterns
    
    // Get file base name for reporting
    const fileName = filePath.split('/').pop() || filePath;
    
    // Basic patterns to look for
    const hasLongFunctions = /function\s+\w+\s*\([^)]*\)\s*{[^}]{500,}}/g.test(content);
    const hasDuplicateCode = /(.{50,})\1{1,}/g.test(content);
    const hasDeepNesting = /\{\s*\{\s*\{\s*\{\s*\{\s*\{/g.test(content);
    const usesManyConsoleLog = (content.match(/console\.log/g) || []).length > 5;
    const longLines = content.split('\n').some(line => line.length > 100);
    const inconsistentSpacing = /\s{2}\w+/g.test(content) && /\s{4}\w+/g.test(content);
    
    // Analysis based on file type
    let analysis = `I've analyzed \`${fileName}\` (${content.length} characters, ${content.split('\n').length} lines).\n\n`;
    
    // Create a list of potential improvements
    const improvements: string[] = [];
    
    if (fileExtension === 'ts' || fileExtension === 'tsx' || fileExtension === 'js' || fileExtension === 'jsx') {
      // JavaScript/TypeScript specific analysis
      
      // Check for React patterns
      const isReactFile = content.includes('React') || content.includes('jsx') || fileExtension === 'tsx' || fileExtension === 'jsx';
      
      if (isReactFile) {
        analysis += `This appears to be a React ${fileExtension === 'tsx' || fileExtension === 'jsx' ? 'component' : 'module'}.\n\n`;
        
        // Check for component patterns
        const usesFunctionComponents = content.includes('function ') && content.includes('return (');
        const usesClassComponents = content.includes('class ') && content.includes('extends React.Component');
        const usesHooks = /use[A-Z]\w+/.test(content);
        const mightNeedMemo = content.includes('React.memo') || content.includes('memo(');
        
        if (usesClassComponents) {
          improvements.push("Consider migrating class components to function components with hooks for better maintainability and performance.");
        }
        
        if (usesHooks && content.includes('useEffect') && content.includes('useState') && !content.includes('useCallback') && content.includes('function ')) {
          improvements.push("Consider using `useCallback` for functions defined within components to prevent unnecessary re-renders.");
        }
        
        if (!mightNeedMemo && usesFunctionComponents && content.length > 500) {
          improvements.push("For large components, consider using `React.memo` to prevent unnecessary re-renders.");
        }
        
        if (content.includes('useState') && /const\s+\[\w+,\s*set\w+\]\s*=\s*useState/.test(content) && content.match(/useState/g)!.length > 3) {
          improvements.push("Consider consolidating multiple related state variables into a single object using useReducer for more maintainable state management.");
        }
      } else {
        analysis += `This appears to be a ${fileExtension === 'ts' ? 'TypeScript' : 'JavaScript'} module.\n\n`;
      }
      
      // Check for import patterns
      const imports = content.match(/import\s+.+\s+from\s+['"].+['"]/g) || [];
      
      if (imports.length > 10) {
        improvements.push("Consider reorganizing imports by grouping them by type (external dependencies, internal modules, etc.) or breaking the file into smaller modules.");
      }
      
      // Check for export patterns
      const hasNamedExports = content.includes('export const') || content.includes('export function');
      const hasDefaultExport = content.includes('export default');
      
      if (hasNamedExports && hasDefaultExport) {
        analysis += "This module uses both named exports and a default export.\n\n";
      }
      
      // Check code structure
      if (hasLongFunctions) {
        improvements.push("Break down long functions into smaller, more focused functions to improve readability and testability.");
      }
      
      if (hasDuplicateCode) {
        improvements.push("Extract repeated code patterns into reusable functions or constants.");
      }
      
      if (hasDeepNesting) {
        improvements.push("Reduce nested code blocks through early returns, guard clauses, or extracting nested logic into separate functions.");
      }
      
      if (usesManyConsoleLog) {
        improvements.push("Remove or replace console.log statements with proper logging or debugging tools.");
      }
    } else if (fileExtension === 'css' || fileExtension === 'scss') {
      // CSS specific analysis
      analysis += `This appears to be a ${fileExtension === 'scss' ? 'SCSS' : 'CSS'} stylesheet.\n\n`;
      
      const duplicateSelectors = new Set();
      const selectors = content.match(/[.#]\w+(\s+[.#]\w+)*/g) || [];
      
      selectors.forEach(selector => {
        if (selectors.filter(s => s === selector).length > 1) {
          duplicateSelectors.add(selector);
        }
      });
      
      if (duplicateSelectors.size > 0) {
        improvements.push(`Consolidate duplicate selectors (${Array.from(duplicateSelectors).slice(0, 3).join(', ')}${duplicateSelectors.size > 3 ? '...' : ''}) to avoid specificity issues and improve maintainability.`);
      }
      
      if (content.includes('!important')) {
        improvements.push("Avoid using !important declarations by improving selector specificity.");
      }
    } else if (fileExtension === 'json') {
      // JSON specific analysis
      analysis += "This appears to be a JSON configuration file.\n\n";
      
      try {
        JSON.parse(content);
      } catch (e) {
        improvements.push("Fix JSON syntax errors to ensure the file is valid.");
      }
    }
    
    // General code quality checks
    if (longLines) {
      improvements.push("Break long lines (>100 characters) into multiple lines for better readability.");
    }
    
    if (inconsistentSpacing) {
      improvements.push("Standardize indentation and spacing for consistent code style.");
    }
    
    // If no specific improvements were found
    if (improvements.length === 0) {
      analysis += "The code appears well-structured and follows good practices. No significant refactoring opportunities identified.";
      return {
        code: content, // Return unchanged code
        analysis,
        improvements: "No critical improvements needed at this time."
      };
    }
    
    // Generate improved code - in a real implementation, this would use a more sophisticated approach
    // For now, we'll just format the code and make simple changes
    let improvedCode = content;
    
    // Example simple transformations - in practice, this would be more sophisticated
    if (fileExtension === 'ts' || fileExtension === 'tsx' || fileExtension === 'js' || fileExtension === 'jsx') {
      // Remove excess console.logs
      if (usesManyConsoleLog) {
        const consoleLogMatches = content.match(/^\s*console\.log\([^)]*\);?\s*$/gm) || [];
        if (consoleLogMatches.length > 2) {
          // Keep only important console logs
          for (let i = 2; i < consoleLogMatches.length; i++) {
            improvedCode = improvedCode.replace(consoleLogMatches[i], '');
          }
        }
      }
      
      // Fix spacing issues
      if (inconsistentSpacing) {
        // Standardize to 2 spaces
        improvedCode = improvedCode.replace(/^(\s{4})+/gm, match => '  '.repeat(match.length / 4));
      }
    }
    
    return {
      code: improvedCode,
      analysis,
      improvements: improvements.join("\n\n")
    };
  };

  return {
    refactorFile,
    applyRefactoring,
    isRefactoring
  };
};
