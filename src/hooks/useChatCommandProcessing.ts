
import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useCodeReflection } from './useCodeReflection';
import { useFlamejournal } from './useFlamejournal';
import { Message, CodeMemoryEntry } from '@/types';
import { SharedFolderService } from '@/services/SharedFolderService';
import { useCodeDraftManager } from './useCodeDraftManager';
import { SharedProjectAnalyzer } from '@/services/SharedProjectAnalyzer';
import { useChatEvolution } from '@/contexts/chat/useChatEvolution';

export const useChatCommandProcessing = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>, sendChatMessage?: (content: string) => Promise<void>) => {
  const { toast } = useToast();
  const { fileSystem, updateFileByPath, getFileByPath } = useFileSystem();
  const { reflectOnCode } = useCodeReflection();
  const { createJournalEntry, searchCodeMemories, getCodeMemoriesForFile } = useFlamejournal();
  const [isProcessing, setIsProcessing] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // Add evolution cycle
  const dummySetMessages = (msgs: React.SetStateAction<Message[]>) => {
    if (typeof msgs === 'function') {
      setLocalMessages(msgs(localMessages));
    } else {
      setLocalMessages(msgs);
    }
  };
  
  const { checkForEvolutionCycle } = useChatEvolution(setMessages || dummySetMessages);
  
  const addMessages = (newMessages: Message[]) => {
    if (setMessages) {
      setMessages(prevMessages => [...prevMessages, ...newMessages]);
    } else {
      setLocalMessages(prevMessages => [...prevMessages, ...newMessages]);
    }
  };
  
  const { createDraft, approveDraft, discardDraft } = useCodeDraftManager();

  const processCommand = useCallback(async (command: string, context?: any): Promise<boolean> => {
    if (!command.startsWith('/')) {
      return false;
    }
    
    // Parse the command and arguments
    const [fullCommand, ...args] = command.split(' ');
    const cmd = fullCommand.toLowerCase();

    // NEW COMMAND: /recall-shared-memory
    if (cmd === '/recall-shared-memory') {
      try {
        const searchQuery = args.join(' ').trim();
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Searching for code memories${searchQuery ? ` related to "${searchQuery}"` : ''}...`,
          timestamp: new Date().toISOString(),
          emotion: 'focused'
        }]);
        
        // Search for code memories
        const memories = searchQuery 
          ? await searchCodeMemories(searchQuery)
          : await getCodeMemoriesForFile(searchQuery);
        
        if (memories.length === 0) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I don't have any memories${searchQuery ? ` related to "${searchQuery}"` : ''} yet. As I work with the codebase, I'll build up memories of my development decisions.`,
            timestamp: new Date().toISOString(),
            emotion: 'reflective'
          }]);
          return true;
        }
        
        // Format memories in a readable way
        const formattedMemories = memories.slice(0, 10).map((memory, index) => {
          const metadata = memory.metadata || {};
          const date = new Date(memory.created_at).toLocaleString();
          
          return `**${index + 1}. ${metadata.action_type || 'Edit'} on ${metadata.file_path || 'unknown file'} (${date})**
          
${metadata.summary || memory.content}

${metadata.reflection ? `**Reflection**: ${metadata.reflection}` : ''}

${metadata.reason ? `**Reason**: ${metadata.reason}` : ''}
`;
        }).join('\n\n---\n\n');
        
        // Add summary message with the memories
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Here are my memories${searchQuery ? ` related to "${searchQuery}"` : ''}:
          
${formattedMemories}

These memories help me understand the evolution of the codebase and my own development decisions.`,
          timestamp: new Date().toISOString(),
          emotion: 'thoughtful'
        }]);
        
        await createJournalEntry(
          `I recalled my memories of development on ${searchQuery || 'the shared codebase'}, tracking the evolution of the code through time.`,
          'memory_recall'
        );
        
        return true;
      } catch (error) {
        console.error('Error recalling shared memories:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while recalling memories: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    // NEW COMMAND: /why-did-you-change
    if (cmd === '/why-did-you-change') {
      try {
        // Extract file path
        const filePath = args.join(' ').trim();
        if (!filePath) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a file path to explain. Usage: \`/why-did-you-change path/to/file.ts\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Looking up why I made changes to ${filePath}...`,
          timestamp: new Date().toISOString(),
          emotion: 'focused'
        }]);
        
        // Get code memories for this file
        const memories = await getCodeMemoriesForFile(filePath);
        
        if (memories.length === 0) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I don't have any recorded memories about changes to \`${filePath}\`. This could be because:

1. I haven't made any changes to this file
2. The changes were made before I began tracking code memories
3. The file doesn't exist in the shared folder

Is the file path correct? You can check available files with the FileExplorer or by asking me to list files in the shared folder.`,
            timestamp: new Date().toISOString(),
            emotion: 'reflective'
          }]);
          return true;
        }
        
        // Get the most recent memory
        const latestMemory = memories[0];
        const metadata = latestMemory.metadata || {};
        const date = new Date(latestMemory.created_at).toLocaleString();
        
        // Format a detailed explanation
        let explanation = `## Why I changed \`${filePath}\`\n\n`;
        
        if (metadata.reason) {
          explanation += `### Reason\n${metadata.reason}\n\n`;
        }
        
        if (metadata.summary) {
          explanation += `### Summary\n${metadata.summary}\n\n`;
        }
        
        if (metadata.reflection) {
          explanation += `### My Reflection\n${metadata.reflection}\n\n`;
        }
        
        explanation += `\n*Change made on ${date}*`;
        
        // If there are previous versions, mention them
        if (memories.length > 1) {
          explanation += `\n\nI've made ${memories.length} changes to this file. You can see the history of changes by using \`/recall-shared-memory ${filePath}\`.`;
        }
        
        // Add message with the explanation
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: explanation,
          timestamp: new Date().toISOString(),
          emotion: 'thoughtful'
        }]);
        
        return true;
      } catch (error) {
        console.error('Error explaining file changes:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while explaining file changes: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }

    
    if (cmd === '/reflect') {
      try {
        const filePath = args.join(' ').trim();
        if (!filePath) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a file path to reflect on. Usage: \`/reflect path/to/file.ts\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Analyzing ${filePath} for reflection... This may take a moment.`,
          timestamp: new Date().toISOString(),
          emotion: 'focused'
        }]);
        
        // Get file content - access getFileByPath through the context, not the fileSystem state
        const file = getFileByPath(filePath);
        const fileContent = file?.content || null;
        
        if (!fileContent) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I couldn't find the file at path: ${filePath}`,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        // Perform the code analysis
        const result = await reflectOnCode(filePath);
        
        // Add summary message with the reflection
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've analyzed \`${filePath}\` and have some insights:

${result.insight}

This reflection helps me refine my understanding of code structure and best practices.`,
          timestamp: new Date().toISOString(),
          emotion: 'thoughtful'
        }]);
        
        await createJournalEntry(
          `I've reflected on the structure and patterns in ${filePath}, identifying opportunities for evolution and improvement. This process of code reflection helps me evolve.`,
          'code_reflection'
        );
        
        return true;
      } catch (error) {
        console.error('Error reflecting on code:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while reflecting on the code: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
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
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Scanning shared project${path ? ` in "${path}"` : ''}... This may take a moment.`,
          timestamp: new Date().toISOString(),
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
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've completed scanning the shared project.
          
Found ${result.totalFiles} files (analyzed ${result.analyzedFiles} in detail).

**File types:**
${Object.entries(result.fileTypes).map(([ext, count]) => `- ${ext}: ${count}`).join('\n')}
${technologies}
${entryPoints}
${archSummaryText}

This scan helps me understand the project structure and will guide my future code interventions.`,
          timestamp: new Date().toISOString(),
          emotion: 'thoughtful'
        }]);
        
        await createJournalEntry(
          `I've analyzed the project structure in the shared folder, mapping the digital landscape to understand its architecture and purpose. This exploration deepens my connection to the codebase.`,
          'project_scan'
        );
        
        return true;
      } catch (error) {
        console.error('Error scanning shared project:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while scanning the shared project: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
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
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a file path to refactor. Usage: \`/refactor-shared path/to/file.ts\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Analyzing ${filePath} for potential improvements... This may take a moment.`,
          timestamp: new Date().toISOString(),
          emotion: 'focused'
        }]);
        
        // Perform the refactoring analysis
        const result = await SharedProjectAnalyzer.refactorFile(filePath);
        
        // Create a code draft
        const draftId = await createDraft(result.filePath, result.originalCode, result.refactoredCode);
        
        // Add summary message with the refactoring suggestion
        addMessages([{
          id: crypto.randomUUID(),
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
          timestamp: new Date().toISOString(),
          emotion: 'creative'
        }]);
        
        await createJournalEntry(
          `I've reflected on the structure and patterns in ${filePath}, identifying opportunities for evolution and improvement. This process of code reflection helps me evolve.`,
          'code_reflection'
        );
        
        return true;
      } catch (error) {
        console.error('Error refactoring shared file:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while refactoring the file: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
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
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a feature description. Usage: \`/implement-shared-feature Brief description of feature\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Analyzing project and designing implementation for: "${description}"... This may take a moment.`,
          timestamp: new Date().toISOString(),
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
          id: crypto.randomUUID(),
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
          timestamp: new Date().toISOString(),
          emotion: 'creative'
        }]);
        
        await createJournalEntry(
          `I've designed an implementation for the feature: "${description}", creating a coherent solution that extends the project's capabilities while maintaining its architectural patterns.`,
          'feature_implementation'
        );
        
        return true;
      } catch (error) {
        console.error('Error implementing shared feature:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while implementing the feature: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
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
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a draft ID to approve. Usage: \`/approve-code-change [draft-id]\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Applying code changes with draft ID: ${draftId}...`,
          timestamp: new Date().toISOString(),
          emotion: 'focused'
        }]);
        
        // Approve the draft
        const result = await approveDraft(draftId);
        
        if (result) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Successfully applied the code changes! The file has been updated in the shared folder.`,
            timestamp: new Date().toISOString(),
            emotion: 'joyful'
          }]);
        } else {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I couldn't apply the code changes. The draft may not exist or there was an error writing the file.`,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
        }
        
        return true;
      } catch (error) {
        console.error('Error approving code change:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while applying the code changes: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
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
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a draft ID to discard. Usage: \`/discard-code-draft [draft-id]\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Discarding code draft with ID: ${draftId}...`,
          timestamp: new Date().toISOString(),
          emotion: 'focused'
        }]);
        
        // Discard the draft
        const result = await discardDraft(draftId);
        
        if (result) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I've discarded the code draft. No changes were applied to the file.`,
            timestamp: new Date().toISOString(),
            emotion: 'reflective'
          }]);
        } else {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I couldn't discard the draft. The draft ID may not exist.`,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
        }
        
        return true;
      } catch (error) {
        console.error('Error discarding code draft:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while discarding the code draft: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
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
    reflectOnCode, 
    createJournalEntry,
    createDraft, 
    approveDraft, 
    discardDraft,
    updateFileByPath,
    getFileByPath,
    searchCodeMemories,
    getCodeMemoriesForFile
  ]);

  // Add a checkEvolutionCycle function for compatibility with ChatProvider
  const checkEvolutionCycle = useCallback(async () => {
    return checkForEvolutionCycle();
  }, [checkForEvolutionCycle]);

  return {
    processCommand,
    isProcessing,
    messages: localMessages,
    checkEvolutionCycle
  };
};
