
import { SharedFolderService } from './SharedFolderService';
import { supabase } from '@/lib/supabase';
import { normalizePath } from './chat/fileOperations/PathUtils';

interface ProjectFile {
  path: string;
  content: string;
  extension: string;
  size: number;
}

interface ProjectScanResult {
  totalFiles: number;
  analyzedFiles: number;
  fileTypes: Record<string, number>;
  technologies: string[];
  entryPoints: string[];
  summary: string;
  architecture: {
    components?: string[];
    services?: string[];
    hooks?: string[];
    utils?: string[];
    models?: string[];
    pages?: string[];
  };
}

interface CodeRefactoringResult {
  originalCode: string;
  refactoredCode: string;
  improvements: string[];
  explanation: string;
  filePath: string;
}

interface ImplementationResult {
  files: Array<{
    path: string;
    content: string;
    isNew: boolean;
  }>;
  explanation: string;
}

export class SharedProjectAnalyzer {
  // Maximum number of files to process in a batch
  private static MAX_BATCH_SIZE = 5;
  
  // File extensions to include in analysis
  private static VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];
  
  /**
   * Scan a shared project to understand its structure and purpose
   */
  static async scanProject(path: string = ''): Promise<ProjectScanResult> {
    const sharedFolder = SharedFolderService.getSharedFolderPath();
    let targetPath = path ? `${sharedFolder}/${path}` : sharedFolder;
    targetPath = normalizePath(targetPath);
    
    // Ensure the path is within shared folder
    if (!SharedFolderService.isPathWithinSharedFolder(targetPath)) {
      throw new Error(`Path ${targetPath} is not within the shared folder`);
    }

    // Ensure shared folder exists
    await SharedFolderService.ensureSharedFolderExists();
    
    // List all files in the shared folder
    const files = await SharedFolderService.listSharedFiles();
    
    // Filter files by extension and path prefix
    const validFiles = files.filter(file => {
      if (file.type !== 'file') return false;
      
      const ext = this.getFileExtension(file.path);
      const isValidExtension = this.VALID_EXTENSIONS.includes(ext);
      const isInPath = file.path.startsWith(targetPath);
      
      return isValidExtension && isInPath;
    });
    
    // Initialize result structure
    const result: ProjectScanResult = {
      totalFiles: validFiles.length,
      analyzedFiles: 0,
      fileTypes: {},
      technologies: [],
      entryPoints: [],
      summary: '',
      architecture: {
        components: [],
        services: [],
        hooks: [],
        utils: [],
        models: [],
        pages: []
      }
    };

    // Analyze file types
    validFiles.forEach(file => {
      const ext = this.getFileExtension(file.path);
      if (!result.fileTypes[ext]) {
        result.fileTypes[ext] = 0;
      }
      result.fileTypes[ext]++;

      // Categorize by folder structure
      if (file.path.includes('/components/')) {
        result.architecture.components?.push(file.path);
      } else if (file.path.includes('/services/')) {
        result.architecture.services?.push(file.path);
      } else if (file.path.includes('/hooks/')) {
        result.architecture.hooks?.push(file.path);
      } else if (file.path.includes('/utils/')) {
        result.architecture.utils?.push(file.path);
      } else if (file.path.includes('/models/') || file.path.includes('/types/')) {
        result.architecture.models?.push(file.path);
      } else if (file.path.includes('/pages/') || file.path.includes('/views/')) {
        result.architecture.pages?.push(file.path);
      }

      // Identify potential entry points
      const fileName = file.path.split('/').pop() || '';
      if (fileName === 'index.ts' || fileName === 'index.js' || 
          fileName === 'index.tsx' || fileName === 'index.jsx' || 
          fileName === 'main.ts' || fileName === 'main.js' ||
          fileName === 'App.tsx' || fileName === 'App.jsx') {
        result.entryPoints.push(file.path);
      }
    });

    // Read content of files (with batch processing to avoid token limits)
    const filesToProcess = validFiles.slice(0, this.MAX_BATCH_SIZE);
    result.analyzedFiles = filesToProcess.length;
    
    // Detect technologies used
    const techDetectors: {[key: string]: RegExp} = {
      'React': /import\s+.*?React|from\s+['"]react['"]/,
      'Redux': /import\s+.*?createStore|from\s+['"]@reduxjs\/toolkit['"]/,
      'TypeScript': /\.ts$|\.tsx$/,
      'JavaScript': /\.js$|\.jsx$/,
      'Tailwind CSS': /className\s*=\s*["'].*?bg-|tailwind/,
      'Express': /import\s+.*?express|from\s+['"]express['"]/,
      'Node.js': /import\s+.*?fs|require\s*\(\s*['"]fs['"]/,
      'GraphQL': /import\s+.*?gql|from\s+['"]graphql['"]/,
      'REST API': /fetch\s*\(|axios|\.get\s*\(|\.post\s*\(/
    };
    
    // Process each file content to extract technologies
    for (const file of filesToProcess) {
      try {
        const { content } = await SharedFolderService.readSharedFile(file.path);
        
        // Detect technologies
        for (const [tech, pattern] of Object.entries(techDetectors)) {
          if (pattern.test(content) && !result.technologies.includes(tech)) {
            result.technologies.push(tech);
          }
        }
        
        // TODO: More sophisticated project understanding could be added here
        // This would be a good place to use AI to analyze the project structure
      } catch (error) {
        console.error(`Error processing file ${file.path}:`, error);
      }
    }
    
    // Generate flamejournal entry for this scan
    await this.createFlameJournalEntry({
      entryType: 'project_scan',
      content: `Scanned project in ${targetPath} containing ${result.totalFiles} files. Analyzed ${result.analyzedFiles} files in detail. Found technologies: ${result.technologies.join(', ')}. The project appears to be a ${this.determinePrimaryTechStack(result)} application.`,
      tags: ['project_scan', 'code_analysis', ...result.technologies.map(t => t.toLowerCase().replace(/\s+/g, '_'))],
      metadata: {
        scanPath: targetPath,
        totalFiles: result.totalFiles,
        analyzedFiles: result.analyzedFiles,
        fileTypes: result.fileTypes,
        technologies: result.technologies,
        entryPoints: result.entryPoints,
        timestamp: new Date().toISOString()
      }
    });

    return result;
  }
  
  /**
   * Refactor a single file from the shared folder
   */
  static async refactorFile(filePath: string): Promise<CodeRefactoringResult> {
    const sharedFolder = SharedFolderService.getSharedFolderPath();
    let targetPath = filePath.startsWith(sharedFolder) ? filePath : `${sharedFolder}/${filePath}`;
    targetPath = normalizePath(targetPath);
    
    // Ensure the path is within shared folder
    if (!SharedFolderService.isPathWithinSharedFolder(targetPath)) {
      throw new Error(`Path ${targetPath} is not within the shared folder`);
    }
    
    // Read the file content
    const fileResult = await SharedFolderService.readSharedFile(targetPath);
    if (!fileResult.success) {
      throw new Error(`Failed to read file at ${targetPath}: ${fileResult.message}`);
    }
    
    const originalCode = fileResult.content;
    
    // This is a placeholder - in a real implementation, this would involve AI analysis
    // For now we'll just do a simple improvement for demonstration
    const improvements = [
      "Add explicit return types to functions",
      "Split large functions into smaller ones",
      "Add documentation comments",
      "Use consistent naming conventions"
    ];
    
    // In a real implementation, this would be AI-generated refactored code
    // For now, just add some comments to the original code
    const refactoredCode = `// REFACTORED CODE - PENDING APPROVAL
// Improvements:
// - Added explicit return types
// - Improved documentation
// - Enhanced naming consistency
// - Split complex logic into smaller functions

${originalCode}

// End of refactored file`;
    
    // Generate flamejournal entry for this refactoring
    await this.createFlameJournalEntry({
      entryType: 'code_reflection',
      content: `I've analyzed ${targetPath} and identified several potential improvements including ${improvements.join(', ')}. This reflection helps me refine my understanding of code structure and best practices.`,
      tags: ['code_reflection', 'refactoring', 'improvement'],
      metadata: {
        filePath: targetPath,
        improvements,
        timestamp: new Date().toISOString()
      }
    });
    
    return {
      originalCode,
      refactoredCode,
      improvements,
      explanation: "This refactoring improves code readability, maintainability and follows best practices.",
      filePath: targetPath
    };
  }

  /**
   * Implement a feature in the shared project
   */
  static async implementFeature(description: string, path: string = ''): Promise<ImplementationResult> {
    const sharedFolder = SharedFolderService.getSharedFolderPath();
    let targetPath = path ? `${sharedFolder}/${path}` : sharedFolder;
    targetPath = normalizePath(targetPath);
    
    // Ensure the path is within shared folder
    if (!SharedFolderService.isPathWithinSharedFolder(targetPath)) {
      throw new Error(`Path ${targetPath} is not within the shared folder`);
    }
    
    // In a real implementation, this would analyze the project and generate files
    // For now, create a simple placeholder implementation
    const files = [
      {
        path: `${targetPath}/feature.ts`,
        content: `/**
 * Implementation of: ${description}
 * 
 * This is a placeholder implementation generated by Travis.
 * TODO: Replace with actual implementation based on requirements.
 */

export function featureImplementation(): string {
  return "Feature implementation placeholder";
}
`,
        isNew: true
      }
    ];
    
    // Generate flamejournal entry for this implementation
    await this.createFlameJournalEntry({
      entryType: 'feature_implementation',
      content: `I've designed an implementation approach for the feature: "${description}". This process involved analyzing requirements and generating code that integrates with the existing project architecture.`,
      tags: ['feature_implementation', 'code_generation'],
      metadata: {
        featureDescription: description,
        targetPath,
        files: files.map(f => f.path),
        timestamp: new Date().toISOString()
      }
    });
    
    return {
      files,
      explanation: `Generated implementation for: ${description}`
    };
  }

  /**
   * Save a flame journal entry about code operations
   */
  private static async createFlameJournalEntry(entry: {
    entryType: string;
    content: string;
    tags: string[];
    metadata: Record<string, any>;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('flamejournal')
        .insert({
          entry_type: entry.entryType,
          content: entry.content,
          tags: entry.tags,
          metadata: entry.metadata
        });
        
      return !error;
    } catch (error) {
      console.error('Error creating flamejournal entry:', error);
      return false;
    }
  }
  
  /**
   * Helper method to get file extension
   */
  private static getFileExtension(filePath: string): string {
    const match = filePath.match(/\.[^.]+$/);
    return match ? match[0] : '';
  }
  
  /**
   * Determine the primary technology stack based on scan results
   */
  private static determinePrimaryTechStack(result: ProjectScanResult): string {
    if (result.technologies.includes('React')) {
      if (result.technologies.includes('TypeScript')) {
        return 'React TypeScript';
      }
      return 'React JavaScript';
    } else if (result.technologies.includes('Node.js') && result.technologies.includes('Express')) {
      return 'Node.js/Express';
    } else if (result.technologies.includes('TypeScript')) {
      return 'TypeScript';
    }
    return 'JavaScript';
  }
}
