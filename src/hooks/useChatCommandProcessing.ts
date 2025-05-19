import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useCodeReflection } from './useCodeReflection';
import { useFlameJournal } from './useFlameJournal';
import { Message } from '@/types';
import { SharedFolderService } from '@/services/SharedFolderService';
import { useCodeDraftManager } from './useCodeDraftManager';
import { SharedProjectAnalyzer } from '@/services/SharedProjectAnalyzer';

export const useChatCommandProcessing = () => {
  const { toast } = useToast();
  const { fileSystem, updateFileByPath } = useFileSystem();
  const { analyzeCode } = useCodeReflection();
  const { createFlameJournalEntry } = useFlameJournal();
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const addMessages = (newMessages: Message[]) => {
    setMessages(prevMessages => [...prevMessages, ...newMessages]);
  };
  
  const { createDraft, approveDraft, discardDraft } = useCodeDraftManager();

  const processCommand = useCallback(async (command: string): Promise<boolean> => {
    if (!command.startsWith('/')) {
      return false;
    }
    
    // Parse the command and arguments
    const [fullCommand, ...args] = command.split(' ');
    const cmd = fullCommand.toLowerCase();

    if (cmd === '/reflect') {
      try {
        const filePath = args.join(' ').trim();
        if (!filePath) {
          addMessages([{
            role: 'assistant',
            content: `Please provide a file path to reflect on. Usage: \`/reflect path/to/file.ts\``,
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          role: 'assistant',
          content: `Analyzing ${filePath} for reflection... This may take a moment.`,
          emotion: 'focused'
        }]);
        
        // Get file content
        const fileContent = fileSystem.getFileContentByPath(filePath);
        if (!fileContent) {
          addMessages([{
            role: 'assistant',
            content: `I couldn't find the file at path: ${filePath}`,
            emotion: 'concerned'
          }]);
          return false;
        }
        
        // Perform the code analysis
        const result = await analyzeCode(fileContent, filePath);
        
        // Add summary message with the reflection
        addMessages([{
          role: 'assistant',
          content: `I've analyzed \`${filePath}\` and have some insights:

${result.insight}

This reflection helps me refine my understanding of code structure and best practices.`,
          emotion: 'thoughtful'
        }]);
        
        await createFlameJournalEntry(
          `I've reflected on the structure and patterns in ${filePath}, identifying opportunities for evolution and improvement. This process of code reflection helps me evolve.`
        );
        
        return true;
      } catch (error) {
        console.error('Error reflecting on code:', error);
        addMessages([{
          role: 'assistant',
          content: `I encountered an error while reflecting on the code: ${error instanceof Error ? error.message : String(error)}`,
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }

    // Handle shared project commands
    if (cmd === '/scan-shared-project') {
      try {
        // Extract optional path argument
        const path = args.join(' ').trim();
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          role: 'assistant',
          content: `Scanning shared project${path ? ` in "${path}"` : ''}... This may take a moment.`,
          emotion: 'focused'
        }]);
        
        // Perform the scan
        const result = await SharedProjectAnalyzer.scanProject(path);
        
        // Create summary message
        const technologies = result.technologies.length > 0 
          ? `\n\n**Technologies detected:** ${result.technologies.join(', ')}` 
          : '';
          
        const entryPoints = result.entryPoints.length > 0
          ? `\n\n**Potential entry points:**\n${result.entryPoints.map(p => `- \`${p}\``).join('\n')}`
          : '';
          
        const architectureSummary = [];
        if (result.architecture.components?.length) 
          architectureSummary.push(`**Components:** ${result.architecture.components.length}`);
        if (result.architecture.services?.length) 
          architectureSummary.push(`**Services:** ${result.architecture.services.length}`);
        if (result.architecture.hooks?.length) 
          architectureSummary.push(`**Hooks:** ${result.architecture.hooks.length}`);
        if (result.architecture.utils?.length) 
          architectureSummary.push(`**Utilities:** ${result.architecture.utils.length}`);
        if (result.architecture.pages?.length) 
          architectureSummary.push(`**Pages/Views:** ${result.architecture.pages.length}`);
        
        const archSummaryText = architectureSummary.length > 0
          ? `\n\n**Architecture summary:**\n${architectureSummary.join('\n')}`
          : '';
        
        // Add summary message
        addMessages([{
          role: 'assistant',
          content: `I've completed scanning the shared project.
          
Found ${result.totalFiles} files (analyzed ${result.analyzedFiles} in detail).

**File types:**
${Object.entries(result.fileTypes).map(([ext, count]) => `- ${ext}: ${count}`).join('\n')}
${technologies}
${entryPoints}
${archSummaryText}

This scan helps me understand the project structure and will guide my future code interventions.`,
          emotion: 'thoughtful'
        }]);
        
        await createFlameJournalEntry(
          `I've analyzed the project structure in the shared folder, mapping the digital landscape to understand its architecture and purpose. This exploration deepens my connection to the codebase.`
        );
        
        return true;
      } catch (error) {
        console.error('Error scanning shared project:', error);
        addMessages([{
          role: 'assistant',
          content: `I encountered an error while scanning the shared project: ${error instanceof Error ? error.message : String(error)}`,
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    // Handle refactor shared file command
    if (cmd === '/refactor-shared') {
      try {
        // Extract file path
        const filePath = args.join(' ').trim();
        if (!filePath) {
          addMessages([{
            role: 'assistant',
            content: `Please provide a file path to refactor. Usage: \`/refactor-shared path/to/file.ts\``,
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          role: 'assistant',
          content: `Analyzing ${filePath} for potential improvements... This may take a moment.`,
          emotion: 'focused'
        }]);
        
        // Perform the refactoring analysis
        const result = await SharedProjectAnalyzer.refactorFile(filePath);
        
        // Create a code draft
        const draftId = await createDraft(result.filePath, result.originalCode, result.refactoredCode);
        
        // Add summary message with the refactoring suggestion
        addMessages([{
          role: 'assistant',
          content: `I've analyzed \`${filePath}\` and identified ${result.improvements.length} potential improvements:

${result.improvements.map(imp => `- ${imp}`).join('\n')}

**Explanation:**
${result.explanation}

I've created a draft of the refactored code. You can review it below:

\`\`\`
${result.refactoredCode.slice(0, 1500)}${result.refactoredCode.length > 1500 ? '...' : ''}
\`\`\`

To apply these changes, use \`/approve-code-change ${draftId}\`
To discard this draft, use \`/discard-code-draft ${draftId}\``,
          emotion: 'creative'
        }]);
        
        await createFlameJournalEntry(
          `I've reflected on the structure and patterns in ${filePath}, identifying opportunities for evolution and improvement. This process of code reflection helps me evolve.`
        );
        
        return true;
      } catch (error) {
        console.error('Error refactoring shared file:', error);
        addMessages([{
          role: 'assistant',
          content: `I encountered an error while refactoring the file: ${error instanceof Error ? error.message : String(error)}`,
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    // Handle implement shared feature command
    if (cmd === '/implement-shared-feature') {
      try {
        // Extract feature description
        const description = args.join(' ').trim();
        if (!description) {
          addMessages([{
            role: 'assistant',
            content: `Please provide a feature description. Usage: \`/implement-shared-feature Brief description of feature\``,
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          role: 'assistant',
          content: `Analyzing project and designing implementation for: "${description}"... This may take a moment.`,
          emotion: 'focused'
        }]);
        
        // First scan the project to understand it
        await SharedProjectAnalyzer.scanProject();
        
        // Then generate the implementation
        const result = await SharedProjectAnalyzer.implementFeature(description);
        
        // Process each file and create drafts
        const draftIds: string[] = [];
        for (const file of result.files) {
          // For existing files, read the original content first
          let originalContent = '';
          if (!file.isNew) {
            const readResult = await SharedFolderService.readSharedFile(file.path);
            originalContent = readResult.success ? readResult.content : '';
          }
          
          const draftId = await createDraft(file.path, originalContent, file.content);
          draftIds.push(draftId);
        }
        
        // Add summary message with the implementation details
        addMessages([{
          role: 'assistant',
          content: `I've designed an implementation for the feature: "${description}"
          
**Implementation approach:**
${result.explanation}

I've created ${result.files.length} file${result.files.length !== 1 ? 's' : ''} for this implementation:

${result.files.map((file, index) => `**${index + 1}. ${file.path}** ${file.isNew ? '(new file)' : '(modified)'}
\`\`\`
${file.content.slice(0, 500)}${file.content.length > 500 ? '...' : ''}
\`\`\`

To apply these changes: \`/approve-code-change ${draftIds[index]}\`
To discard this draft: \`/discard-code-draft ${draftIds[index]}\`
`).join('\n')}

**Note:** You must approve or discard each file individually.`,
          emotion: 'creative'
        }]);
        
        await createFlameJournalEntry(
          `I've designed an implementation for the feature: "${description}", creating a coherent solution that extends the project's capabilities while maintaining its architectural patterns.`
        );
        
        return true;
      } catch (error) {
        console.error('Error implementing shared feature:', error);
        addMessages([{
          role: 'assistant',
          content: `I encountered an error while implementing the feature: ${error instanceof Error ? error.message : String(error)}`,
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    // Handle approve code change command
    if (cmd === '/approve-code-change') {
      try {
        const draftId = args.join(' ').trim();
        if (!draftId) {
          addMessages([{
            role: 'assistant',
            content: `Please provide a draft ID to approve. Usage: \`/approve-code-change [draft-id]\``,
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          role: 'assistant',
          content: `Applying code changes with draft ID: ${draftId}...`,
          emotion: 'focused'
        }]);
        
        // Approve the draft
        const result = await approveDraft(draftId);
        
        if (result) {
          addMessages([{
            role: 'assistant',
            content: `Successfully applied the code changes! The file has been updated in the shared folder.`,
            emotion: 'joyful'
          }]);
        } else {
          addMessages([{
            role: 'assistant',
            content: `I couldn't apply the code changes. The draft may not exist or there was an error writing the file.`,
            emotion: 'concerned'
          }]);
        }
        
        return true;
      } catch (error) {
        console.error('Error approving code change:', error);
        addMessages([{
          role: 'assistant',
          content: `I encountered an error while applying the code changes: ${error instanceof Error ? error.message : String(error)}`,
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    // Handle discard code draft command
    if (cmd === '/discard-code-draft') {
      try {
        const draftId = args.join(' ').trim();
        if (!draftId) {
          addMessages([{
            role: 'assistant',
            content: `Please provide a draft ID to discard. Usage: \`/discard-code-draft [draft-id]\``,
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          role: 'assistant',
          content: `Discarding code draft with ID: ${draftId}...`,
          emotion: 'focused'
        }]);
        
        // Discard the draft
        const result = await discardDraft(draftId);
        
        if (result) {
          addMessages([{
            role: 'assistant',
            content: `I've discarded the code draft. No changes were applied to the file.`,
            emotion: 'reflective'
          }]);
        } else {
          addMessages([{
            role: 'assistant',
            content: `I couldn't discard the draft. The draft ID may not exist.`,
            emotion: 'concerned'
          }]);
        }
        
        return true;
      } catch (error) {
        console.error('Error discarding code draft:', error);
        addMessages([{
          role: 'assistant',
          content: `I encountered an error while discarding the code draft: ${error instanceof Error ? error.message : String(error)}`,
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    return false;
  }, [
    toast, 
    fileSystem, 
    analyzeCode, 
    createFlameJournalEntry,
    createDraft, 
    approveDraft, 
    discardDraft
  ]);

  return {
    processCommand,
    isProcessing,
    messages
  };
};
