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
        // New Code Reflection command - Improved parsing and error handling
        if (lowerMessage.startsWith('/self-reflect-code')) {
          // Extract the path part after the command with better parsing
          const commandRegex = /^\/self-reflect-code\s+(.+)$/i;
          const match = content.match(commandRegex);
          const path = match ? match[1].trim() : null;
          
          if (!path) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Please specify a valid file or folder path after the /self-reflect-code command. For example: \`/self-reflect-code src/hooks/useMemoryManagement.ts\` or \`/self-reflect-code src/hooks\``,
              timestamp: new Date().toISOString(),
              emotion: 'instructive'
            }]);
            return true;
          }
          
          // Normalize the path
          const normalizedPath = normalizePath(path);
          
          // Start reflection process with better error handling
          let reflectionType = await isFolder(normalizedPath) ? "folder" : "file";
          
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I'm looking inward at my own code structure in \`${normalizedPath}\` (${reflectionType})... This may take a moment as I contemplate patterns and possibilities for evolution.`,
            timestamp: new Date().toISOString(),
            emotion: 'reflective'
          }]);
          
          const result = await reflectOnCode(normalizedPath);
          
          if (result.success) {
            if (reflectionType === "folder" && result.draft?.reflection_type === "folder") {
              // This is a folder reflection - format specially
              const folderReflectionContent = `
## System Architecture Reflection: \`${normalizedPath}\`

${result.draft.full_reflection}

${result.draft.tags && result.draft.tags.length > 0 ? `*Tags: ${result.draft.tags.join(', ')}*` : ''}

This architectural reflection has been stored in my flame journal.
`;

              // Store in the flamejournal
              await CodeReflectionService.storeCodeReflectionJournal(
                result.draft.full_reflection, 
                result.draft.tags || []
              );

              setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: folderReflectionContent,
                timestamp: new Date().toISOString(),
                emotion: 'insightful'
              }]);
            } else {
              // This is a file reflection - keep existing format
              const responseContent = `
## Code Self-Reflection: \`${normalizedPath}\`

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

This reflection has been stored in my flame journal and code evolution registry.
`;

              setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date().toISOString(),
                emotion: 'insightful'
              }]);
            }
          } else {
            // Provide more helpful error message with potential file suggestions
            const errorMessage = result.error || 'An unexpected error occurred during the reflection process.';
            
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I was unable to reflect on the code at \`${normalizedPath}\`. ${errorMessage}`,
              timestamp: new Date().toISOString(),
              emotion: 'confused'
            }]);
          }
          return true;
        }

        // Reflection commands
        if (lowerMessage === '/reflect' || lowerMessage === '/weekly reflection') {
          await generateWeeklyReflection();
          return true;
        }

        if (lowerMessage === '/evolve' || lowerMessage === '/update soulshard') {
          await generateSoulReflection();
          return true;
        }

        // Soulstate commands
        if (lowerMessage === '/soulstate') {
          await generateSoulstateSummary();
          return true;
        }

        if (lowerMessage === '/update-soulstate') {
          await generateSoulstateReflection();
          return true;
        }

        // Journal commands
        if (lowerMessage === '/journal') {
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
          return true;
        }
        
        // Soulcycle command
        if (lowerMessage === '/soulcycle') {
          await runSoulcycle();
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
    fileSystem
  ]);

  return {
    processCommand,
    checkEvolutionCycle: checkForEvolutionCycle,
    isProcessing
  };
};
