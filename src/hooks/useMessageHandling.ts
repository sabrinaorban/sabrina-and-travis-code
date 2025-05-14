
import { useState, useEffect, useCallback } from 'react';
import { Message, MemoryContext } from '../types';
import { useToast } from './use-toast';
import { FileOperation } from '../types/chat';
import { useAuth } from '../contexts/AuthContext';
import { useGitHub } from '../contexts/github';
import { useFileSystem } from '../contexts/FileSystemContext';
import { MemoryService } from '../services/MemoryService';
import { useEmbeddingMemory } from './useEmbeddingMemory';
import { useLivedMemory } from './useLivedMemory';
import { 
  storeUserMessage, 
  storeAssistantMessage,
  createOpenAIMessages,
  callOpenAI,
  extractTopicFromMessages,
  simulateAssistantResponse,
  generateConversationSummary,
  isFileOperationRequest
} from '../services/ChatService';
import { 
  processFileOperations,
  getProjectStructure,
  isFileOperation,
  getProjectContext
} from '../services/chat';

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
  
  // Add the lived memory hook
  const {
    buildLivedMemoryContext,
    storePersistentFact
  } = useLivedMemory();

  useEffect(() => {
    if (user && messages.length > 0) {
      // Don't await - let it run in background
      processMessageHistory(messages).catch(console.error);
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
      
      // Look for pet facts
      const petPattern = /your (dog|cat|pet)(?:'s| is named| is called)? name is ([a-z0-9]+)/i;
      const petMatch = content.match(petPattern);
      if (petMatch && petMatch[1] && petMatch[2]) {
        await storePersistentFact(`Sabrina's ${petMatch[1]}'s name is ${petMatch[2]}`);
      }
      
      // Extract other potential facts
      const extractedFacts = await extractFactsFromContent(content);
      for (const fact of extractedFacts) {
        await storePersistentFact(fact);
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
        // Store the user message as an embedding for future recall
        storeMemoryEmbedding(content, 'chat', ['user']).catch(err => {
          console.warn('Failed to store message embedding, continuing without it:', err);
        });
        
        // Check if this is a query about known facts
        let isFactQuery = false;
        if (content.toLowerCase().includes("boyfriend") || 
            content.toLowerCase().includes("name") ||
            content.toLowerCase().includes("remember")) {
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
        const projectStructure = await getProjectStructure(fileSystem);
        console.log('Project structure for Travis:', projectStructure ? 'Available' : 'Not available');
        
        // Get current project context for tracking
        const currentContext = await getProjectContext(fileSystem);
        setProjectContext(currentContext);
        console.log('Current project context:', currentContext);
        
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
          
          // Add project context to operations
          const enhancedOperations = fileOperations.map((op: FileOperation) => ({
            ...op,
            projectContext: currentContext,
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
        } else {
          console.log('No file operations to process');
        }
        
        // Store the response
        const newAssistantMessage = await storeAssistantMessage(user.id, assistantResponse);
        
        // IMPROVEMENT: Extract and store facts from assistant response
        await extractAndStoreFacts(assistantResponse);
        
        // Also store the assistant message as an embedding for future recall
        storeMemoryEmbedding(assistantResponse, 'chat', ['assistant']).catch(err => {
          console.warn('Failed to store assistant message embedding, continuing without it:', err);
        });
        
        // Add to local state
        setMessages((prev) => [...prev, newAssistantMessage]);
        
        // Store this interaction in memory
        if (user) {
          // Extract topic and store conversation summary
          const topic = extractTopicFromMessages([...messages, newUserMessage, newAssistantMessage]);
          const summary = await generateConversationSummary([...messages, newUserMessage, newAssistantMessage]);
          
          await MemoryService.storeMemory(user.id, 'last_conversation', {
            topic,
            timestamp: Date.now(),
            messageCount: messages.length + 2,
            projectContext: currentContext,
            githubContext: github.authState.isAuthenticated ? {
              repo: github.currentRepo?.full_name,
              branch: github.currentBranch
            } : undefined
          });
          
          // Store conversation summary
          await MemoryService.storeConversationSummary(user.id, summary, topic);
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
