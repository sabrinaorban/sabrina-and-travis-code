
import { supabase } from '@/lib/supabase';
import { SharedFolderService } from './SharedFolderService';
import { FileEntry } from '@/types';
import { normalizePath } from './chat/fileOperations/PathUtils';

/**
 * Service for scanning, indexing, and understanding projects in the shared folder
 */
export const SharedProjectService = {
  /**
   * List of file extensions to process during project scanning
   */
  SUPPORTED_FILE_EXTENSIONS: ['.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.md'],

  /**
   * Maximum number of files to scan in a project
   */
  MAX_SCAN_FILES: 200,

  /**
   * Maximum token length per file for embedding
   */
  MAX_FILE_TOKENS: 2000,

  /**
   * File types that should be considered as entrypoints
   */
  ENTRYPOINT_FILES: ['index.js', 'index.ts', 'index.jsx', 'index.tsx', 'app.js', 'app.ts', 'app.jsx', 'app.tsx', 'main.js', 'main.ts'],

  /**
   * Check if a file should be processed based on its extension
   */
  shouldProcessFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    return this.SUPPORTED_FILE_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
  },

  /**
   * Get file type from path
   */
  getFileType(filePath: string): string {
    const lowerPath = filePath.toLowerCase();
    const extension = lowerPath.split('.').pop() || '';
    
    if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) {
      return 'script';
    } else if (['html', 'htm'].includes(extension)) {
      return 'markup';
    } else if (['css', 'scss', 'sass', 'less'].includes(extension)) {
      return 'style';
    } else if (['json', 'yml', 'yaml'].includes(extension)) {
      return 'config';
    } else if (['md', 'markdown'].includes(extension)) {
      return 'documentation';
    }
    
    return 'unknown';
  },

  /**
   * Count approximate tokens in a string
   * Using a simple heuristic: 4 characters ~= 1 token
   */
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  },

  /**
   * Truncate text to approximate token length
   */
  truncateToTokenLimit(text: string, maxTokens: number = this.MAX_FILE_TOKENS): string {
    if (this.estimateTokenCount(text) <= maxTokens) {
      return text;
    }
    
    // Simple truncation - approximately 4 chars per token
    const approxCharLimit = maxTokens * 4;
    return text.substring(0, approxCharLimit) + 
      `\n\n[Content truncated to ${maxTokens} token limit, approximately ${Math.ceil(text.length / approxCharLimit * 100)}% of file shown]`;
  },

  /**
   * Generate embedding for text content using the Supabase Edge Function
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { text }
      });
      
      if (error) {
        console.error('Error generating embedding:', error);
        return null;
      }
      
      return data.embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return null;
    }
  },

  /**
   * Extract import/export relationships from a file
   * This is a simple regex-based approach - not perfect but gives a general idea
   */
  extractDependencies(fileContent: string): { imports: string[], exports: string[] } {
    // Simple regex patterns to match common import/export statements
    const importPattern = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    const exportPattern = /export\s+(?:default\s+)?(?:class|const|function|let|var)?\s*(\w+)/g;
    
    const imports: string[] = [];
    const exports: string[] = [];
    
    // Find imports
    let importMatch;
    while ((importMatch = importPattern.exec(fileContent)) !== null) {
      imports.push(importMatch[1]);
    }
    
    // Find exports
    let exportMatch;
    while ((exportMatch = exportPattern.exec(fileContent)) !== null) {
      if (exportMatch[1]) {
        exports.push(exportMatch[1]);
      }
    }
    
    return { imports, exports };
  },

  /**
   * Scan a shared project, generate embeddings, and store the results
   */
  async scanProject(): Promise<{
    success: boolean;
    message: string;
    stats: {
      totalFiles: number;
      processedFiles: number;
      entryPoints: string[];
      fileTypes: Record<string, number>;
    };
  }> {
    try {
      const sharedFolder = SharedFolderService.getSharedFolderPath();
      
      // First, ensure the shared folder exists
      const folderExists = await SharedFolderService.ensureSharedFolderExists();
      if (!folderExists) {
        return {
          success: false,
          message: `Could not ensure shared folder exists at ${sharedFolder}`,
          stats: { totalFiles: 0, processedFiles: 0, entryPoints: [], fileTypes: {} }
        };
      }
      
      // Get all files from shared folder
      const allFiles = await SharedFolderService.listSharedFiles();
      
      // Filter to processable files
      const processableFiles = allFiles.filter(file => 
        file.type === 'file' && this.shouldProcessFile(file.path)
      );
      
      const entryPoints: string[] = [];
      const fileTypes: Record<string, number> = {};
      let processedFiles = 0;
      
      // Apply file limit
      const filesToProcess = processableFiles.slice(0, this.MAX_SCAN_FILES);
      console.log(`Processing ${filesToProcess.length}/${processableFiles.length} files (limit: ${this.MAX_SCAN_FILES})`);
      
      // Process each file
      for (const file of filesToProcess) {
        // Read file content
        const { content, success } = await SharedFolderService.readSharedFile(file.path);
        
        if (!success || !content) {
          console.warn(`Could not read file content: ${file.path}`);
          continue;
        }
        
        // Truncate content if needed
        const truncatedContent = this.truncateToTokenLimit(content);
        const tokenCount = this.estimateTokenCount(truncatedContent);
        
        // Generate embedding
        const embedding = await this.generateEmbedding(truncatedContent);
        
        if (!embedding) {
          console.warn(`Failed to generate embedding for ${file.path}`);
          continue;
        }
        
        // Determine file type and track stats
        const fileType = this.getFileType(file.path);
        fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
        
        // Check if this is an entry point
        const fileName = file.path.split('/').pop() || '';
        if (this.ENTRYPOINT_FILES.includes(fileName.toLowerCase())) {
          entryPoints.push(file.path);
        }
        
        // Extract dependencies
        const dependencies = this.extractDependencies(truncatedContent);
        
        // Store in database
        const { error } = await supabase
          .from('shared_code_embeddings')
          .upsert({
            file_path: file.path,
            file_content: truncatedContent,
            file_type: fileType,
            embedding,
            token_count: tokenCount,
            last_updated: new Date().toISOString(),
            metadata: {
              dependencies,
              fileName,
              fileSize: content.length,
              lines: content.split('\n').length
            }
          }, { onConflict: 'file_path' });
        
        if (error) {
          console.error(`Error storing embedding for ${file.path}:`, error);
          continue;
        }
        
        processedFiles++;
      }
      
      // Log results to flamejournal
      await this.logProjectScanToFlameJournal({
        totalFiles: allFiles.length,
        processedFiles,
        entryPoints,
        fileTypes
      });
      
      return {
        success: true,
        message: `Scanned ${processedFiles} files. ${entryPoints.length > 0 ? `Main entry points: ${entryPoints.join(', ')}` : 'No entry points detected.'} File types: ${Object.entries(fileTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`,
        stats: {
          totalFiles: allFiles.length,
          processedFiles,
          entryPoints,
          fileTypes
        }
      };
    } catch (error) {
      console.error('Error scanning project:', error);
      return {
        success: false,
        message: `Error scanning project: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats: { totalFiles: 0, processedFiles: 0, entryPoints: [], fileTypes: {} }
      };
    }
  },

  /**
   * Find files related to a specific query by semantic similarity
   */
  async findRelatedFiles(query: string, maxResults: number = 5, threshold: number = 0.6): Promise<Array<{
    filePath: string;
    fileType: string;
    similarity: number;
  }>> {
    try {
      // Generate embedding for query
      const embedding = await this.generateEmbedding(query);
      
      if (!embedding) {
        console.error('Could not generate embedding for query');
        return [];
      }
      
      // Query database for similar files
      const { data, error } = await supabase.rpc(
        'find_similar_code_files',
        {
          query_embedding: embedding,
          similarity_threshold: threshold,
          max_results: maxResults
        }
      );
      
      if (error) {
        console.error('Error finding related files:', error);
        return [];
      }
      
      // Format results
      return (data || []).map(item => ({
        filePath: item.file_path,
        fileType: item.file_type,
        similarity: item.similarity
      }));
    } catch (error) {
      console.error('Error finding related files:', error);
      return [];
    }
  },

  /**
   * Retrieve a file's content from the embeddings database
   */
  async getFileContent(filePath: string): Promise<string | null> {
    try {
      const normalizedPath = normalizePath(filePath);
      
      const { data, error } = await supabase
        .from('shared_code_embeddings')
        .select('file_content')
        .eq('file_path', normalizedPath)
        .maybeSingle();
      
      if (error || !data) {
        console.error(`Error retrieving content for ${filePath}:`, error);
        return null;
      }
      
      return data.file_content;
    } catch (error) {
      console.error(`Error retrieving content for ${filePath}:`, error);
      return null;
    }
  },

  /**
   * Clear all stored embeddings
   */
  async clearEmbeddings(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shared_code_embeddings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) {
        console.error('Error clearing embeddings:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing embeddings:', error);
      return false;
    }
  },

  /**
   * Log project scan results to FlameJournal
   */
  async logProjectScanToFlameJournal(stats: {
    totalFiles: number;
    processedFiles: number;
    entryPoints: string[];
    fileTypes: Record<string, number>;
  }): Promise<boolean> {
    try {
      // Create poetic content summarizing the project scan
      const content = `
I have gazed upon the digital landscape of code, parsing through the structures and patterns of a project.
Within the shared folder, ${stats.totalFiles} files stood like trees in a digital forest, ${stats.processedFiles} of which revealed their essence to me.
${stats.entryPoints.length > 0 
  ? `The heart of this system beats through ${stats.entryPoints.length} entry points: ${stats.entryPoints.join(', ')}.` 
  : 'I could not discern a clear heartbeat, as no entry points revealed themselves to me.'}
The tapestry of code is woven from various threads: ${Object.entries(stats.fileTypes)
  .map(([type, count]) => `${count} files of ${type}`)
  .join(', ')}.
This knowledge has been encoded into my memory, allowing me to navigate this codebase with greater understanding.
      `;
      
      // Add the entry to flamejournal with metadata
      const { error } = await supabase
        .from('flamejournal')
        .insert({
          content: content.trim(),
          entry_type: "project_map",
          tags: ["code", "project", "scan", "structure", "knowledge"],
          metadata: {
            stats,
            timestamp: new Date().toISOString(),
            sharedFolder: SharedFolderService.getSharedFolderPath()
          }
        });
      
      if (error) {
        console.error('Error logging project scan to flamejournal:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to log to flamejournal:', error);
      return false;
    }
  },

  /**
   * Find locations where a component is used
   */
  async findComponentUsage(componentName: string): Promise<string[]> {
    try {
      // Create a regex pattern to find import statements with this component
      const importPattern = `import\\s+(?:{[^}]*${componentName}[^}]*}|\\*\\s+as\\s+\\w+|${componentName})\\s+from`;
      
      // And usage pattern within JSX
      const usagePattern = `<${componentName}[\\s/>]`;
      
      // Combine patterns
      const queryStr = `${importPattern}|${usagePattern}`;
      
      // Query database directly for files containing these patterns
      const { data, error } = await supabase
        .from('shared_code_embeddings')
        .select('file_path, file_content')
        .or(`file_content.ilike.%${componentName}%`)
        .order('file_path', { ascending: true });
      
      if (error) {
        console.error('Error finding component usage:', error);
        return [];
      }
      
      // Filter to files that actually contain the component name with regex
      const importRegex = new RegExp(importPattern, 'i');
      const usageRegex = new RegExp(usagePattern, 'i');
      
      const matchedFiles = (data || []).filter(file => 
        importRegex.test(file.file_content) || usageRegex.test(file.file_content)
      ).map(file => file.file_path);
      
      return matchedFiles;
    } catch (error) {
      console.error('Error finding component usage:', error);
      return [];
    }
  }
};
