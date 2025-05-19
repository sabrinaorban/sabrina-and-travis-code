
import { useCallback } from 'react';

/**
 * Hook for generating and displaying file differences
 */
export const useFileDiffs = () => {
  /**
   * Generate a simplified diff between two code snippets
   */
  const generateDiff = useCallback((oldCode: string, newCode: string): string => {
    if (oldCode === newCode) {
      return ''; // No differences
    }
    
    // Split into lines
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    // Very simple line-by-line diff
    const diff: string[] = [];
    
    // Find the maximum number of lines to compare
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    // Track if we've shown a section header yet
    let currentSection = '';
    let changeCount = 0;
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = i < oldLines.length ? oldLines[i] : '';
      const newLine = i < newLines.length ? newLines[i] : '';
      
      // Determine the section based on line content
      let lineSection = 'unknown';
      
      // Try to identify the section from code patterns
      if (oldLine.includes('import ') || newLine.includes('import ')) {
        lineSection = 'imports';
      } else if (oldLine.includes('export ') || newLine.includes('export ')) {
        lineSection = 'exports';
      } else if (oldLine.includes('function ') || newLine.includes('function ') || 
                oldLine.includes(' = () =>') || newLine.includes(' = () =>')) {
        lineSection = 'functions';
      } else if (oldLine.includes('class ') || newLine.includes('class ')) {
        lineSection = 'classes';
      } else if (oldLine.includes('interface ') || newLine.includes('interface ') ||
                oldLine.includes('type ') || newLine.includes('type ')) {
        lineSection = 'types';
      }
      
      // Add section header if we're entering a new section
      if (lineSection !== 'unknown' && lineSection !== currentSection) {
        currentSection = lineSection;
        diff.push(`@@ ${currentSection} section @@`);
      }
      
      // Add the line to the diff if there's a difference
      if (oldLine !== newLine) {
        changeCount++;
        
        // Only show a reasonable number of changes (max 20)
        if (changeCount <= 20) {
          if (oldLine && !newLine) {
            diff.push(`- ${oldLine}`);
          } else if (!oldLine && newLine) {
            diff.push(`+ ${newLine}`);
          } else {
            diff.push(`- ${oldLine}`);
            diff.push(`+ ${newLine}`);
          }
        } else if (changeCount === 21) {
          diff.push('... additional changes omitted for brevity');
        }
      }
    }
    
    return diff.join('\n');
  }, []);

  /**
   * Generate an inline diff with explanations
   */
  const generateInlineDiff = useCallback((oldCode: string, newCode: string, explanations: Record<number, string>): string => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    // Create an array to hold the inline diff
    const inlineDiff: string[] = [];
    
    // Track the current line number in the new code
    let newLineNum = 0;
    
    // Process each line of the new code
    for (let i = 0; i < newLines.length; i++) {
      const line = newLines[i];
      newLineNum++;
      
      // Add the line
      inlineDiff.push(`${newLineNum.toString().padStart(3, ' ')}| ${line}`);
      
      // Add explanation if one exists for this line
      if (explanations[newLineNum]) {
        inlineDiff.push(`    | ^ ${explanations[newLineNum]}`);
      }
    }
    
    return inlineDiff.join('\n');
  }, []);

  return {
    generateDiff,
    generateInlineDiff
  };
};
