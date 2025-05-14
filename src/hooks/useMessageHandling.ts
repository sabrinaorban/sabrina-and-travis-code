import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, MemoryContext } from '../types';
import { useToast } from '@/hooks/use-toast';
import { FileOperation } from '../types/chat';
import { useAuth } from '../contexts/AuthContext';
import { useGitHub } from '../contexts/github';
import { useFileSystem } from '../contexts/FileSystemContext';
import { MemoryService } from '../services/MemoryService';
import { useEmbeddingMemory } from './useEmbeddingMemory';
import { useLivedMemory } from './useLivedMemory';
import { usePersistentMemory } from './usePersistentMemory';
import { 
  storeUserMessage, 
  storeAssistantMessage,
  createOpenAIMessages,
  callOpenAI,
  extractTopicFromMessages,
  generateConversationSummary,
  isFileOperationRequest
} from '../services/ChatService';
import { 
  processFileOperations,
  getProjectStructure,
  isFileOperation,
  getProjectContext
} from '../services/chat';
import { simulateAssistantResponse } from '../services/utils/ConversationUtils';

// Create a debounce function to prevent too frequent calls
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => Promise<ReturnType<F>>) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise((resolve) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        resolve(func(...args));
      }, waitFor);
    });
  };
};

export const useMessageHandling = (
  externalMessages?: Message[],
  externalSetMessages?: React.Dispatch<React.SetStateAction<Message[]>>,
  externalSetIsTyping?: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Use internal state only if external state is not provided
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [internalIsTyping, setInternalIsTyping] = useState(false);
  
  // Use either external or internal state
  const messages = externalMessages || internalMessages;
  const setMessages = externalSetMessages || setInternalMessages;
  const setIsTyping = externalSetIsTyping || setInternalIsTyping;
  
  const [fileOperationResults, setFileOperationResults] = useState<FileOperation[] | undefined>(undefined);
  const [projectContext, setProjectContext] = useState<any>(null);
  
  // Track if a message is being sent to prevent duplicate sends
  const isSendingMessageRef = useRef(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const github = useGitHub();
  const fileSystem = useFileSystem();
  const {
    storeMemoryEmbedding,
    retrieveRelevantMemories,
    processMessageHistory,
    extractFactsFromContent
  } = useEmbeddingMemory();
  
  // Add the persistent memory hook for more reliable fact storage
  const { storePersistentFact } = usePersistentMemory();
  
  // Add the lived memory hook
  const {
    buildLivedMemoryContext
  } = useLivedMemory();

  // Process message history in the background
  useEffect(() => {
    if (user && messages.length > 0) {
      // Create a debounced version of processMessageHistory
      const debouncedProcess = debounce(async () => {
        try {
          await processMessageHistory(messages);
        } catch (error) {
          console.error('Error processing message history:', error);
        }
      }, 3000); // Wait 3 seconds after last change
      
      debouncedProcess();
    }
  }, [user, messages.length, processMessageHistory]);

  // Extract and store important facts from assistant responses
  const extractAndStoreFacts = useCallback(async (content: string) => {
    if (!user || !content) return;
    
    try {
      // Look for patterns like "your boyfriend's name is Dan"
      const boyFriendPattern = /your boyfriend(?:'s| is named| is called)? name is ([a-z0-9]+)/i;
      const boyfriendMatch = content.match(boyFriendPattern);
      if (boyfriendMatch && boyfriendMatch[1]) {
        await storePersistentFact(`Sabrina's boyfriend's name is ${boyfriendMatch[1]}`);
      }
      
      // Also store direct mentions of boyfriend name from the user
      const directBoyFriendPattern = /(?:his|boyfriend's) name is ([a-z0-9]+)/i;
      const directMatch = content.match(directBoyFriendPattern);
      if (directMatch && directMatch[1]) {
        await storePersistentFact(`Sabrina's boyfriend's name is ${directMatch[1]}`);
      }
      
      // Look for pet facts
      const petPattern = /your (dog|cat|pet)(?:'s| is named| is called)? name is ([a-z0-9]+)/i;
      const petMatch = content.match(petPattern);
      if (petMatch && petMatch[1] && petMatch[2]) {
        await storePersistentFact(`Sabrina's ${petMatch[1]}'s name is ${petMatch[2]}`);
      }
      
      // Use the batch API for multiple facts extraction to improve performance
      const extractedFacts = await extractFactsFromContent(content);
      if (extractedFacts.length > 0) {
        // Use Promise.all for parallel execution
        await Promise.all(extractedFacts.map(fact => storePersistentFact(fact)));
      }
    } catch (error) {
      console.error('Error extracting and storing facts:', error);
    }
  }, [user, storePersistentFact, extractFactsFromContent]);

  const sendMessage = async (content: string, memoryContext: MemoryContext = {}) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive',
      });
      return;
    }
    
    // Don't send empty messages
    if (!content.trim()) return;
    
    // Prevent multiple sends in parallel
    if (isSendingMessageRef.current) {
      console.log('Already sending a message, please wait...');
      return;
    }

    isSendingMessageRef.current = true;
    try {
      // Reset file operation results
      setFileOperationResults(undefined);
      
      // Create and add user message
      const newUserMessage = await storeUserMessage(user.id, content);
      
      // Add message to local state immediately for UI responsiveness
      setMessages((prev) => [...prev, newUserMessage]);

      // Set typing indicator while waiting for response
      setIsTyping(true);

      try {
        // Process the user message for fact extraction - do this in the background
        extractAndStoreFacts(content).catch(err => {
          console.warn('Failed to extract facts, continuing without it:', err);
        });
        
        // Store the user message as an embedding for future recall - do this in the background
        storeMemoryEmbedding(content, 'chat', ['user']).catch(err => {
          console.warn('Failed to store message embedding, continuing without it:', err);
        });
        
        // Check if this is a query about known facts
        let isFactQuery = false;
        if (content.toLowerCase().includes("boyfriend") || 
            content.toLowerCase().includes("name") ||
            content.toLowerCase().includes("remember") ||
            content.toLowerCase().includes("recall")) {
          console.log('Detected potential fact query');
          isFactQuery = true;
        }
        
        // Build the lived memory context based on the user message - IMPROVED to ensure it's always called
        console.log('Building lived memory context...');
        const livedMemoryContext = await buildLivedMemoryContext(content);
        console.log('Generated lived memory context blocks:', livedMemoryContext.length);
        
        // Retrieve relevant past memories based on the current message
        let enhancedMemoryContext = { ...memoryContext, livedMemory: livedMemoryContext };
        
        try {
          console.log('Retrieving relevant memories for prompt enhancement...');
          let limit = isFactQuery ? 15 : 10; // Increase limit for fact queries
          const relevantMemories = await retrieveRelevantMemories(content, limit);
          if (relevantMemories.length > 0) {
            // Add relevant memories to the context
            enhancedMemoryContext.relevantMemories = relevantMemories.map(mem => ({
              content: mem.content,
              similarity: mem.similarity
            }));
            
            console.log(`Added ${relevantMemories.length} relevant memories to context`);
          } else {
            console.log('No relevant memories found for this query');
          }
        } catch (memoryError) {
          console.warn('Error retrieving relevant memories, continuing without them:', memoryError);
        }

        // Always get project structure for context - important for file editing
        let projectStructure = null;
        try {
          projectStructure = await getProjectStructure(fileSystem);
          console.log('Project structure for Travis:', projectStructure ? 'Available' : 'Not available');
        } catch (error) {
          console.warn('Error getting project structure, continuing without it:', error);
        }
        
        // Get current project context for tracking
        try {
          const currentContext = await getProjectContext(fileSystem);
          setProjectContext(currentContext);
          console.log('Current project context:', currentContext);
        } catch (error) {
          console.warn('Error getting project context, continuing without it:', error);
        }
        
        // Determine if this is likely a file operation request - with improved detection
        const shouldEnableFileOps = isFileOperation(content);
        console.log('File operations enabled:', shouldEnableFileOps);
        
        // Create the OpenAI messages from chat history
        const openAIMessages = await createOpenAIMessages(
          messages, 
          newUserMessage, 
          enhancedMemoryContext,
          github.authState.isAuthenticated ? {
            username: github.authState.username,
            currentRepo: github.currentRepo?.full_name,
            currentBranch: github.currentBranch
          } : undefined,
          fileSystem
        );
        
        // Call OpenAI API through Supabase Edge Function
        const response = await callOpenAI(
          openAIMessages,
          enhancedMemoryContext,
          shouldEnableFileOps, // Only enable file operations if detected
          projectStructure
        );

        // Process the assistant's response
        const assistantResponse = response.choices[0].message.content;
        const fileOperations = response.choices[0].message.file_operations || [];
        
        // Process any file operations requested by the assistant
        if (fileOperations.length > 0) {
          console.log('Processing file operations:', fileOperations.length, fileOperations);
          
          try {
            // Add project context to operations
            const enhancedOperations = fileOperations.map((op: FileOperation) => ({
              ...op,
              projectContext: projectContext,
              duplicateCheck: true // Enable duplicate checking
            }));
            
            const processedOperations = await processFileOperations(fileSystem, enhancedOperations);
            
            // Update file operation results for UI feedback
            if (processedOperations && processedOperations.length > 0) {
              setFileOperationResults(processedOperations as FileOperation[]);
              
              // Refresh files after operations
              await fileSystem.refreshFiles();
              console.log('Files refreshed after operations');
              
              // Update project context after operations
              const newContext = await getProjectContext(fileSystem);
              setProjectContext(newContext);
            }
          } catch (error) {
            console.warn('Error processing file operations, continuing without them:', error);
          }
        } else {
          console.log('No file operations to process');
        }
        
        // Store the response
        const newAssistantMessage = await storeAssistantMessage(user.id, assistantResponse);
        
        // IMPROVEMENT: Extract and store facts from assistant response
        extractAndStoreFacts(assistantResponse).catch(err => {
          console.warn('Failed to extract facts from assistant response:', err);
        });
        
        // Also store the assistant message as an embedding for future recall
        storeMemoryEmbedding(assistantResponse, 'chat', ['assistant']).catch(err => {
          console.warn('Failed to store assistant message embedding:', err);
        });
        
        // Add to local state
        setMessages((prev) => [...prev, newAssistantMessage]);
        
        // Store this interaction in memory
        if (user) {
          // Extract topic and store conversation summary
          const topic = extractTopicFromMessages([...messages, newUserMessage, newAssistantMessage]);
          
          // Generate summary in the background
          (async () => {
            try {
              const summary = await generateConversationSummary([...messages, newUserMessage, newAssistantMessage]);
              
              await MemoryService.storeMemory(user.id, 'last_conversation', {
                topic,
                timestamp: Date.now(),
                messageCount: messages.length + 2,
                projectContext: projectContext,
                githubContext: github.authState.isAuthenticated ? {
                  repo: github.currentRepo?.full_name,
                  branch: github.currentBranch
                } : undefined
              });
              
              // Store conversation summary
              await MemoryService.storeConversationSummary(user.id, summary, topic);
            } catch (error) {
              console.error('Error generating conversation summary:', error);
            }
          })();
        }
      } catch (error) {
        // If the OpenAI call fails, fall back to simulated responses
        console.error('Error calling OpenAI:', error);
        
        // Simulate Travis's response based on the message content
        const assistantResponse = simulateAssistantResponse(content, {
          githubAuthenticated: github.authState.isAuthenticated,
          githubUsername: github.authState.username || undefined,
          currentRepo: github.currentRepo?.full_name,
          currentBranch: github.currentBranch
        });

        // Add the fallback assistant's response
        const newFallbackMessage = await storeAssistantMessage(user.id, assistantResponse);
        
        setMessages((prev) => [...prev, newFallbackMessage]);
          
        toast({
          title: 'Warning',
          description: 'Using fallback response as OpenAI API call failed',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error in chat flow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
      // Reset sending state after a small delay to prevent accidental double-sends
      setTimeout(() => {
        isSendingMessageRef.current = false;
      }, 300);
    }
  };

  return {
    messages,
    setMessages,
    isTyping: internalIsTyping,
    setIsTyping,
    fileOperationResults,
    setFileOperationResults,
    projectContext,
    sendMessage
  };
};
