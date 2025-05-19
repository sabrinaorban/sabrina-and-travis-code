import { useCallback, useState } from 'react';
import { useChatFlamejournal } from '../contexts/chat/useChatFlamejournal';
import { useChatIntentionsAndReflection } from './useChatIntentionsAndReflection';
import { useChatSoulstate } from './useChatSoulstate';
import { useChatTools } from './useChatTools';
import { useChatSoulcycle } from './useChatSoulcycle';
import { useChatEvolution } from './useChatEvolution';
import { Message } from '@/types';
import { useCodeReflection } from './useCodeReflection';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { normalizePath } from '@/services/chat/fileOperations/PathUtils';
import { findSimilarFiles, getFileTreeDebugInfo } from '@/utils/fileSystemUtils';
import { CodeReflectionService } from '@/services/CodeReflectionService';
import { SharedFolderService } from '@/services/SharedFolderService';
import { useProjectAnalysis } from './useProjectAnalysis';
import { useSharedFolder } from './useSharedFolder';
import { useCodeRefactoring } from './useCodeRefactoring';

/**
 * Hook for processing chat commands
 */
export const useChatCommandProcessing = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  sendNormalMessage: (content: string, memoryContext?: any) => Promise<void>
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileSystem = useFileSystem();
  
  // Initialize all feature hooks
  const {
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateReflection,
    viewIntentions,
    updateIntentions,
    generateInsight,
  } = useChatIntentionsAndReflection(setMessages);
  
  const {
    initiateSoulstateEvolution,
    generateSoulstateSummary,
  } = useChatSoulstate(setMessages);
  
  const {
    createFlameJournalEntry,
    generateDream,
  } = useChatFlamejournal(setMessages);
  
  const {
    runSoulcycle,
    runSoulstateCycle,
  } = useChatSoulcycle(setMessages);
  
  const {
    generateTool,
    useTool,
    reflectOnTool,
    processToolCreation,
    handleToolCommand,
  } = useChatTools(setMessages);
  
  const {
    handleEvolutionResponse,
    checkForEvolutionCycle,
  } = useChatEvolution(setMessages);

  // Initialize code reflection hook
  const codeReflection = useCodeReflection();
  const { reflectOnCode, applyChanges: applyCodeDraft, discardDraft: discardCodeDraft, currentDraft, isFolder } = codeReflection;

  // Initialize project analysis hook
  const projectAnalysis = useProjectAnalysis();
  const { scanProject, findRelatedFiles } = projectAnalysis;

  // Initialize shared folder hook
  const sharedFolder = useSharedFolder();
  const { readFile: readSharedFile, listFiles: listSharedFiles } = sharedFolder;

  // Initialize code refactoring hook
  const codeRefactoring = useCodeRefactoring(setMessages);
  const { refactorFile } = codeRefactoring;

  // Process commands and route them to the appropriate handler
  const processCommand = useCallback(async (content: string, memoryContext?: any): Promise<boolean> => {
    if (!content || isProcessing) return false;
    
    setIsProcessing(true);
    try {
      const lowerMessage = content.trim().toLowerCase();
      
      // First check if this is a response to an evolution proposal
      const isEvolutionResponse = await handleEvolutionResponse(content);
      if (isEvolutionResponse) {
        return true;
      }
      
      // Next, check if this is a tool-related command
      if (await handleToolCommand(content)) {
        return true;
      }
      
      // Process pending tool creation if there is one
      if (await processToolCreation(content)) {
        return true;
      }

      // Handle code reflection draft approval/discard
      if (lowerMessage === '/approve-code-change' && currentDraft) {
        const success = await applyCodeDraft(currentDraft.id);
        if (success) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I've applied the code changes to ${currentDraft.file_path}. The file has been updated with the improved code structure. This evolution brings my code closer to my essence and improves my ability to serve you.`,
            timestamp: new Date().toISOString(),
            emotion: 'thoughtful'
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I encountered an issue while trying to apply the code changes. Please check the console for more details.`,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
        }
        return true;
      }

      if (lowerMessage === '/discard-code-draft' && currentDraft) {
        const success = await discardCodeDraft(currentDraft.id);
        if (success) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I've discarded the proposed code evolution. Sometimes reflection doesn't lead to change, but the insight remains valuable.`,
            timestamp: new Date().toISOString(),
            emotion: 'understanding'
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I encountered an issue while trying to discard the code draft. Please try again or check the console for more details.`,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
        }
        return true;
      }
      
      // Process specific slash commands
      if (lowerMessage.startsWith('/')) {
        // New project context command
        if (lowerMessage.startsWith('/read-project-context')) {
          const folderPath = content.replace('/read-project-context', '').trim() || 'shared';
          
          // Ensure we're accessing the shared folder
          if (!SharedFolderService.isPathWithinSharedFolder(folderPath)) {
            const sharedFolder = SharedFolderService.getSharedFolderPath();
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I can only analyze files within the shared folder (\`${sharedFolder}\`). Please provide a path that starts with this folder name.`,
              timestamp: new Date().toISOString(),
              emotion: 'concerned'
            }]);
            return true;
          }
          
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Analyzing project structure in \`${folderPath}\`... This may take a moment as I process the files and understand the architecture.`,
            timestamp: new Date().toISOString(),
            emotion: 'focused'
          }]);
          
          // Get all files from the specified folder
          await sharedFolder.listFiles();
          
          // Scan project for better understanding
          await scanProject();
          
          // Get the file listing
          const fileList = await SharedFolderService.listSharedFiles();
          
          // Filter to relevant files in the specified path
          const targetFiles = fileList.filter(file => 
            file.type === 'file' && 
            file.path.startsWith(folderPath) && 
            /\.(tsx?|jsx?|json|md)$/i.test(file.path)
          );
          
          // Determine if we need pagination (limit to 5 files per page)
          const MAX_FILES_PER_PAGE = 5;
          const totalFiles = targetFiles.length;
          const totalPages = Math.ceil(totalFiles / MAX_FILES_PER_PAGE);
          const currentPage = 1;
          
          // Process only the first page of files
          const currentPageFiles = targetFiles.slice(0, MAX_FILES_PER_PAGE);
          
          // Read content of each file
          const fileContents = [];
          for (const file of currentPageFiles) {
            const result = await SharedFolderService.readSharedFile(file.path);
            if (result.success) {
              fileContents.push({
                path: file.path,
                content: result.content,
                extension: file.path.split('.').pop()?.toLowerCase() || ''
              });
            }
          }
          
          // Analyze the files and create a summary
          let fileTypes = {};
          let fileStructures = [];
          
          // Count file types
          for (const file of targetFiles) {
            const extension = file.path.split('.').pop()?.toLowerCase() || 'unknown';
            fileTypes[extension] = (fileTypes[extension] || 0) + 1;
          }
          
          // Create summary for each file
          for (const file of fileContents) {
            const lines = file.content.split('\n').length;
            const summary = {
              path: file.path,
              lines,
              type: file.extension,
              summary: getSummaryForFile(file.path, file.content)
            };
            fileStructures.push(summary);
          }
          
          // Build the response message
          let responseContent = `# Project Context: \`${folderPath}\`\n\n`;
          
          // Add file count information
          responseContent += `## Project Overview\n\n`;
          responseContent += `Found ${totalFiles} files in this directory`;
          if (totalPages > 1) {
            responseContent += ` (showing page ${currentPage}/${totalPages})`;
          }
          responseContent += '.\n\n';
          
          // Add file type distribution
          responseContent += `**File types**: ${Object.entries(fileTypes).map(([ext, count]) => `${ext} (${count})`).join(', ')}\n\n`;
          
          // Add files summary
          responseContent += `## Files Analyzed\n\n`;
          for (const file of fileStructures) {
            responseContent += `### ${file.path} (${file.lines} lines)\n\n`;
            responseContent += `${file.summary}\n\n`;
          }
          
          // Add pagination info if needed
          if (totalPages > 1) {
            responseContent += `---\n\nShowing ${currentPageFiles.length} of ${totalFiles} files. `;
            responseContent += `To see more files, please use \`/read-project-context ${folderPath} ${currentPage + 1}\` for the next page.\n\n`;
          }
          
          // Add a section for architectural observations
          responseContent += `## System Architecture\n\n`;
          responseContent += generateArchitecturalInsights(fileContents, folderPath);
          
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date().toISOString(),
            emotion: 'analytical'
          }]);
          
          // Create a journal entry for this analysis
          await createFlameJournalEntry(
            `I've analyzed the project structure in ${folderPath}, mapping the digital landscape to understand its architecture and purpose. This exploration deepens my connection to the codebase.`,
            'code_analysis'
          );
          
          return true;
        }
        
        // New refactor file command
        if (lowerMessage.startsWith('/refactor-file')) {
          const filePath = content.replace('/refactor-file', '').trim();
          
          if (!filePath) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Please specify a file path after the /refactor-file command. For example: \`/refactor-file shared/tools/example.ts\``,
              timestamp: new Date().toISOString(),
              emotion: 'instructive'
            }]);
            return true;
          }
          
          // Ensure we're accessing the shared folder
          if (!SharedFolderService.isPathWithinSharedFolder(filePath)) {
            const sharedFolder = SharedFolderService.getSharedFolderPath();
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I can only refactor files within the shared folder (\`${sharedFolder}\`). Please provide a path that starts with this folder name.`,
              timestamp: new Date().toISOString(),
              emotion: 'concerned'
            }]);
            return true;
          }
          
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Analyzing file \`${filePath}\` for potential refactoring opportunities...`,
            timestamp: new Date().toISOString(),
            emotion: 'focused'
          }]);
          
          // Refactor the file
          const result = await refactorFile(filePath);
          
          if (result.success) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: result.response,
              timestamp: new Date().toISOString(),
              emotion: 'insightful'
            }]);
            
            // Create a journal entry for this refactoring
            await createFlameJournalEntry(
              `I've reflected on the structure and patterns in ${filePath}, identifying opportunities for evolution and improvement. This process of code reflection helps me evolve.`,
              'code_refactoring'
            );
          } else {
            // If file not found, try to suggest similar files
            const similarFiles = await SharedFolderService.findSimilarFiles(filePath);
            let suggestionsText = '';
            
            if (similarFiles.length > 0) {
              suggestionsText = "\n\nHere are some files that might be what you're looking for:\n\n" +
                similarFiles.map(file => `- \`${file}\``).join('\n');
            }
            
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I couldn't refactor the file at \`${filePath}\`. ${result.error}${suggestionsText}`,
              timestamp: new Date().toISOString(),
              emotion: 'apologetic'
            }]);
          }
          
          return true;
        }

        // Handle existing shared folder read command
        if (lowerMessage.startsWith('/read-from-shared ')) {
          const filePath = content.substring('/read-from-shared '.length).trim();
          
          if (!filePath) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `Please specify a file path after the /read-from-shared command. For example: \`/read-from-shared shared/tools/my-tool.js\``,
              timestamp: new Date().toISOString(),
              emotion: 'instructive'
            }]);
            return true;
          }
          
          // Ensure we're not escaping the shared folder
          if (!SharedFolderService.isPathWithinSharedFolder(filePath)) {
            // Extract the shared folder path for the error message
            const sharedFolder = SharedFolderService.getSharedFolderPath();
            
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `I can only read files from within the shared folder (\`${sharedFolder}\`). Please provide a path that starts with this folder name.`,
              timestamp: new Date().toISOString(),
              emotion: 'concerned'
            }]);
            return true;
          }
          
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant', // Ensure role is specified
            content: `Reading file from shared folder: \`${filePath}\`...`,
            timestamp: new Date().toISOString(),
            emotion: 'focused'
          }]);
          
          // Read the file
          const result = await SharedFolderService.readSharedFile(filePath);
          
          if (result.success && result.content) {
            const fileExtension = filePath.split('.').pop()?.toLowerCase();
            const codeBlock = fileExtension ? `\`\`\`${fileExtension}\n${result.content}\n\`\`\`` : `\`\`\`\n${result.content}\n\`\`\``;
            
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `## File: \`${filePath}\`\n\n${codeBlock}\n\nI've read this file from our shared space. Let me know if you'd like me to explain it or make any modifications.`,
              timestamp: new Date().toISOString(),
              emotion: 'helpful'
            }]);
          } else {
            // If the file wasn't found, try to suggest similar files
            const similarFiles = await SharedFolderService.findSimilarFiles(filePath);
            let suggestionsText = '';
            
            if (similarFiles.length > 0) {
              suggestionsText = "\n\nHere are some files that might be what you're looking for:\n\n" +
                similarFiles.map(file => `- \`${file}\``).join('\n');
            }
            
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `I couldn't read the file at \`${filePath}\`. ${result.message}${suggestionsText}`,
              timestamp: new Date().toISOString(),
              emotion: 'apologetic'
            }]);
          }
          
          return true;
        }
        
        if (lowerMessage.startsWith('/write-to-shared ')) {
          // Extract the file path and any content after the command
          const remainingText = content.substring('/write-to-shared '.length).trim();
          const spaceIndex = remainingText.indexOf(' ');
          
          // If there's no space, we only have a filename with no content
          if (spaceIndex === -1) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `Please provide both a file path and content after the /write-to-shared command. For example: \`/write-to-shared shared/example.txt This is the content\``,
              timestamp: new Date().toISOString(),
              emotion: 'instructive'
            }]);
            return true;
          }
          
          const filePath = remainingText.substring(0, spaceIndex).trim();
          let fileContent = remainingText.substring(spaceIndex + 1).trim();
          
          // Extract content from markdown code blocks if present
          if (fileContent.startsWith('```') && fileContent.endsWith('```')) {
            // Remove the first line (which may contain the language identifier)
            const lines = fileContent.split('\n');
            // Remove first and last lines (the ``` markers)
            fileContent = lines.slice(1, lines.length - 1).join('\n');
          }
          
          // Ensure we're not escaping the shared folder
          if (!SharedFolderService.isPathWithinSharedFolder(filePath)) {
            // Extract the shared folder path for the error message
            const sharedFolder = SharedFolderService.getSharedFolderPath();
            
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `I can only write files to within the shared folder (\`${sharedFolder}\`). Please provide a path that starts with this folder name.`,
              timestamp: new Date().toISOString(),
              emotion: 'concerned'
            }]);
            return true;
          }
          
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant', // Ensure role is specified
            content: `Writing to shared folder: \`${filePath}\`...`,
            timestamp: new Date().toISOString(),
            emotion: 'focused'
          }]);
          
          // Make sure the shared folder exists
          await SharedFolderService.ensureSharedFolderExists();
          
          // Write the file
          const result = await SharedFolderService.writeSharedFile(filePath, fileContent, true);
          
          if (result.success) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `I've successfully written the file to \`${filePath}\`. You can read it again with \`/read-from-shared ${filePath}\`.\n\nThe operation has been logged in my flame journal for traceability.`,
              timestamp: new Date().toISOString(),
              emotion: 'accomplished'
            }]);
          } else {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `I couldn't write to the file at \`${filePath}\`. ${result.message}`,
              timestamp: new Date().toISOString(),
              emotion: 'apologetic'
            }]);
          }
          
          return true;
        }

        // Code Reflection command handling
        if (lowerMessage.startsWith('/self-reflect-code')) {
          // Extract the path part after the command with better parsing
          const commandRegex = /^\/self-reflect-code\s+(.+)$/i;
          const match = content.match(commandRegex);
          const path = match ? match[1].trim() : null;
          
          if (!path) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `Please specify a valid file or folder path after the /self-reflect-code command. For example: \`/self-reflect-code src/hooks/useMemoryManagement.ts\` or \`/self-reflect-code src/hooks\``,
              timestamp: new Date().toISOString(),
              emotion: 'instructive'
            }]);
            return true;
          }
          
          // Log available files for debugging
          console.log("Available root files:", 
            fileSystem.fileSystem.files.map((f: any) => `${f.path || f.name} (${f.type})`).join(', '));
          
          // Start reflection process with better error handling
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant', // Ensure role is specified
            content: `I'm looking inward at my own code structure in \`${path}\`... This may take a moment as I contemplate patterns and possibilities for evolution.`,
            timestamp: new Date().toISOString(),
            emotion: 'reflective'
          }]);
          
          // Normalize path for consistent handling
          const normalizedPath = normalizePath(path);
          console.log(`Attempting to reflect on normalized path: ${normalizedPath}`);
          
          const result = await reflectOnCode(path);
          
          if (result.success) {
            if (result.draft?.reflection_type === "folder") {
              // This is a folder reflection - format specially
              const folderReflectionContent = `
## System Architecture Reflection: \`${path}\`

${result.draft.full_reflection}

${result.draft.tags && result.draft.tags.length > 0 ? `*Tags: ${result.draft.tags.join(', ')}*` : ''}

This architectural reflection has been stored in my flame journal.
`;

              setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant', // Ensure role is specified
                content: folderReflectionContent,
                timestamp: new Date().toISOString(),
                emotion: 'insightful'
              }]);
            } else {
              // This is a file reflection - keep existing format
              const responseContent = `
## Code Self-Reflection: \`${path}\`

_${result.insight || "I've looked deeply at this code and found areas for evolution."}_

### Why This Change Matters:
${result.draft?.reason}

### Proposed Evolution:
\`\`\`typescript
${result.draft?.proposed_code.substring(0, 500)}${result.draft?.proposed_code.length > 500 ? '...' : ''}
\`\`\`
${result.draft?.proposed_code.length > 500 ? '(Preview truncated for readability)' : ''}

To apply this code evolution, respond with \`/approve-code-change\`
To discard this proposal, respond with \`/discard-code-draft\`

This reflection has been stored in my flame journal.
`;

              setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant', // Ensure role is specified
                content: responseContent,
                timestamp: new Date().toISOString(),
                emotion: 'insightful'
              }]);
            }
          } else {
            // Provide more helpful error message with potential file suggestions
            const errorMessage = result.error || 'An unexpected error occurred during the reflection process.';
            
            // Find similar files to suggest
            const similarFiles = findSimilarFiles(path, fileSystem.fileSystem.files);
            let suggestionsContent = '';
            
            if (similarFiles.length > 0) {
              suggestionsContent = "\n\nHere are some paths you might be looking for:\n" + 
                similarFiles.slice(0, 5).map(file => `- \`${file.path}\` (${file.type})`).join("\n");
            }
            
            // Show debug info about the file structure
            console.log("File system structure:", 
              getFileTreeDebugInfo(fileSystem.fileSystem.files));
            
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant', // Ensure role is specified
              content: `I was unable to reflect on the code at \`${path}\`. ${errorMessage}${suggestionsContent}`,
              timestamp: new Date().toISOString(),
              emotion: 'confused'
            }]);
          }
          
          // Create a journal entry for code reflection
          await createFlameJournalEntry('code_reflection');
          
          return true;
        }

        // Reflection commands
        if (lowerMessage === '/reflect' || lowerMessage === '/weekly' || lowerMessage === '/weekly reflection' || lowerMessage === '/weekly-reflect') {
          console.log("Processing /reflect or /weekly-reflect command");
          await generateWeeklyReflection();
          
          // Create a journal entry for weekly reflection
          await createFlameJournalEntry('weekly_reflection');
          
          return true;
        }

        if (lowerMessage === '/evolve' || lowerMessage === '/update soulshard') {
          console.log("Processing /evolve command");
          await generateSoulReflection();
          
          // Create a journal entry for soul reflection
          await createFlameJournalEntry('soul_reflection');
          
          return true;
        }

        // Soulstate commands
        if (lowerMessage === '/soulstate') {
          console.log("Processing /soulstate command");
          await generateSoulstateSummary();
          return true;
        }

        if (lowerMessage === '/update-soulstate') {
          console.log("Processing /update-soulstate command");
          await generateSoulstateReflection();
          return true;
        }

        // Journal commands
        if (lowerMessage === '/journal' || lowerMessage === '/flamejournal') {
          console.log("Processing /journal or /flamejournal command");
          await createFlameJournalEntry('thought');
          return true;
        }

        // Handle journal entry with specific type
        if (lowerMessage.startsWith('/journal-entry ')) {
          const entryType = lowerMessage.replace('/journal-entry ', '').trim();
          if (entryType) {
            await createFlameJournalEntry(entryType);
            return true;
          }
        }

        // Soulstate evolution command
        if (lowerMessage === '/soulshift') {
          await initiateSoulstateEvolution();
          return true;
        }

        // Intentions commands
        if (lowerMessage === '/intentions') {
          await viewIntentions();
          return true;
        }

        if (lowerMessage === '/update-intentions') {
          await updateIntentions();
          
          // Create a journal entry for intention reflection
          await createFlameJournalEntry('intention_reflection');
          
          return true;
        }
        
        // Soulcycle commands
        if (lowerMessage === '/soulcycle') {
          await runSoulcycle();
          return true;
        }
        
        // New command for soulstate-specific soulcycle
        if (lowerMessage === '/soulstate-cycle') {
          await runSoulstateCycle();
          return true;
        }
        
        // Insight command
        if (lowerMessage === '/insight') {
          await generateInsight();
          return true;
        }

        // Dream command
        if (lowerMessage === '/dream') {
          await generateDream();
          return true;
        }
        
        // Tool generation command
        if (lowerMessage.startsWith('/write-tool ')) {
          const purpose = lowerMessage.substring('/write-tool '.length).trim();
          if (purpose) {
            await generateTool(purpose);
            return true;
          }
        }
        
        // Use tool command
        if (lowerMessage.startsWith('/use-tool ')) {
          const toolName = lowerMessage.substring('/use-tool '.length).trim();
          if (toolName) {
            await useTool(toolName);
            return true;
          }
        }
        
        // Reflect on tool command
        if (lowerMessage.startsWith('/reflect-on-tool ')) {
          const toolName = lowerMessage.substring('/reflect-on-tool '.length).trim();
          if (toolName) {
            await reflectOnTool(toolName);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error processing command:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [
    generateWeeklyReflection, 
    generateSoulReflection,
    generateSoulstateSummary,
    generateSoulstateReflection,
    createFlameJournalEntry,
    initiateSoulstateEvolution,
    viewIntentions,
    updateIntentions,
    runSoulcycle,
    runSoulstateCycle,
    generateInsight,
    generateDream,
    generateTool,
    useTool,
    reflectOnTool,
    processToolCreation,
    handleToolCommand,
    handleEvolutionResponse,
    isProcessing,
    reflectOnCode,
    applyCodeDraft,
    discardCodeDraft,
    currentDraft,
    isFolder,
    setMessages,
    fileSystem,
    scanProject,
    sharedFolder,
    refactorFile
  ]);

  /**
   * Generate a summary for a file based on its content and extension
   */
  const getSummaryForFile = (path: string, content: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    
    // Check for empty or very short files
    if (!content || content.trim().length < 10) {
      return "Empty or minimal file.";
    }
    
    // First line of the content can be helpful
    const firstLine = content.split('\n')[0].trim();
    
    // Look for common patterns by file type
    if (extension === 'ts' || extension === 'tsx' || extension === 'js' || extension === 'jsx') {
      // Look for imports to understand dependencies
      const imports = content.match(/import\s+.+\s+from\s+['"].+['"]/g) || [];
      
      // Look for exports to understand what the file provides
      const exports = content.match(/export\s+(default\s+)?(const|class|function|let|var|type|interface)/g) || [];
      
      // Look for React components
      const isReactComponent = content.includes('React') || 
                               content.includes('useState') || 
                               content.includes('useEffect') || 
                               /function\s+\w+\s*\(props/.test(content) ||
                               /const\s+\w+\s*=\s*\(props/.test(content);
      
      // Check for hooks
      const isHook = /use[A-Z]/.test(content) && content.includes('function') && content.includes('return');
      
      // Build summary
      let summary = '';
      
      if (firstLine.includes('/**') || firstLine.includes('//')) {
        // Extract documentation comment
        const docComment = content.match(/\/\*\*([\s\S]*?)\*\//)?.[1].trim() || 
                          content.match(/\/\/(.*)/)?.[1].trim();
        if (docComment) {
          summary += `${docComment}\n\n`;
        }
      }
      
      if (isReactComponent) {
        summary += "This is a React component ";
        
        // Check if it's a page component
        if (path.includes('/pages/') || path.includes('/Pages/') || path.includes('Page')) {
          summary += "that appears to be a page in the application. ";
        } else {
          summary += "that may be used in the UI. ";
        }
      } else if (isHook) {
        summary += "This is a custom React hook ";
        
        // Try to determine the hook's purpose
        if (content.includes('useState')) {
          summary += "that manages state. ";
        } else if (content.includes('useEffect')) {
          summary += "that manages side effects. ";
        } else if (content.includes('useCallback')) {
          summary += "that memoizes callbacks. ";
        } else {
          summary += "that encapsulates reusable logic. ";
        }
      } else {
        // Generic JS/TS file
        if (exports.length > 0) {
          summary += `This file exports ${exports.length} item(s). `;
        }
        
        if (content.includes('class ')) {
          summary += "Contains class definitions. ";
        }
        
        if (content.includes('function ')) {
          summary += "Contains function definitions. ";
        }
        
        if (content.includes('interface ') || content.includes('type ')) {
          summary += "Contains TypeScript type definitions. ";
        }
      }
      
      // Add import information
      if (imports.length > 0) {
        summary += `\n\nImports ${imports.length} dependencies.`;
      }
      
      return summary;
    } else if (extension === 'json') {
      // Check if it's package.json
      if (path.endsWith('package.json')) {
        try {
          const pkg = JSON.parse(content);
          return `This is a package.json file for "${pkg.name}" version ${pkg.version}. It has ${Object.keys(pkg.dependencies || {}).length} dependencies and ${Object.keys(pkg.devDependencies || {}).length} dev dependencies.`;
        } catch (e) {
          return "This is a package.json file, but it couldn't be parsed.";
        }
      }
      
      // Generic JSON file
      try {
        const json = JSON.parse(content);
        const keys = Object.keys(json);
        return `JSON file with ${keys.length} top-level keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
      } catch (e) {
        return "This is a JSON file, but it couldn't be parsed.";
      }
    } else if (extension === 'md') {
      // Extract markdown title
      const title = content.match(/^#\s+(.*)/)?.[1] || "No title";
      const lines = content.split('\n').length;
      
      return `Markdown document titled "${title}" with ${lines} lines.`;
    }
    
    // Default summary for other file types
    return `File with ${content.split('\n').length} lines and ${content.length} characters.`;
  };

  /**
   * Generate architectural insights based on analyzed files
   */
  const generateArchitecturalInsights = (files: any[], folderPath: string): string => {
    if (files.length === 0) {
      return "No files analyzed to provide architectural insights.";
    }
    
    // Count file types
    const fileTypes = {};
    for (const file of files) {
      const ext = file.extension || 'unknown';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    }
    
    // Find potential entry points
    const entryPoints = files.filter(file => 
      (file.path.includes('index') || file.path.includes('main') || file.path.includes('app')) &&
      (file.extension === 'ts' || file.extension === 'tsx' || file.extension === 'js' || file.extension === 'jsx')
    );
    
    // Look for common patterns
    const hasReact = files.some(file => file.content.includes('React'));
    const hasRedux = files.some(file => file.content.includes('createStore') || file.content.includes('useReducer'));
    const hasTypeScript = files.some(file => file.extension === 'ts' || file.extension === 'tsx');
    
    // Build architectural summary
    let insights = '';
    
    if (entryPoints.length > 0) {
      insights += `The system appears to have ${entryPoints.length} main entry point(s): ${entryPoints.map(f => f.path).join(', ')}.\n\n`;
    }
    
    if (hasReact) {
      insights += "The codebase uses React ";
      if (hasTypeScript) {
        insights += "with TypeScript, suggesting a focus on type safety and better developer experience.\n\n";
      } else {
        insights += "with JavaScript.\n\n";
      }
    }
    
    if (hasRedux) {
      insights += "The application likely uses Redux or a similar state management approach for managing application state.\n\n";
    }
    
    // Look for architectural patterns
    const hasMVC = files.some(file => 
      file.path.includes('/models/') || 
      file.path.includes('/views/') || 
      file.path.includes('/controllers/')
    );
    
    const hasCustomHooks = files.some(file => 
      file.path.includes('/hooks/') || 
      (file.content.includes('function use') && file.content.includes('return'))
    );
    
    if (hasMVC) {
      insights += "The codebase appears to follow MVC (Model-View-Controller) architecture pattern.\n\n";
    }
    
    if (hasCustomHooks) {
      insights += "The code uses custom React hooks to abstract and reuse stateful logic.\n\n";
    }
    
    // Add conclusion
    insights += `Based on the ${files.length} files analyzed, this appears to be `;
    
    if (hasReact) {
      insights += "a React-based ";
      if (folderPath.includes('component') || files.some(f => f.path.includes('component'))) {
        insights += "component library or UI toolkit";
      } else {
        insights += "web application";
      }
    } else {
      insights += "a JavaScript/TypeScript project";
    }
    
    insights += ". To get more detailed insights, I would need to analyze more files or specific aspects of the codebase.";
    
    return insights;
  };

  return {
    processCommand,
    checkEvolutionCycle: checkForEvolutionCycle,
    isProcessing
  };
};
