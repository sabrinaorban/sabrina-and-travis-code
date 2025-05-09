
import { useState } from 'react';
import { Message } from '../types';
import { useToast } from './use-toast';
import { FileOperation } from '../types/chat';
import { useAuth } from '../contexts/AuthContext';
import { useGitHub } from '../contexts/GitHubContext';
import { useFileSystem } from '../contexts/FileSystemContext';
import { MemoryService } from '../services/MemoryService';
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
  getProjectStructure
} from '../services/chat/FileOperationService';

export const useMessageHandling = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [fileOperationResults, setFileOperationResults] = useState<FileOperation[] | undefined>(undefined);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const github = useGitHub();
  const fileSystem = useFileSystem();

  // Function to send message
  const sendMessage = async (content: string, memoryContext: any) => {
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
        // Determine if this is likely a file operation request - with improved detection
        const shouldEnableFileOps = isFileOperationRequest(content);
        console.log('File operations enabled:', shouldEnableFileOps);
        
        // Get project structure for better context
        const projectStructure = await getProjectStructure(fileSystem);
        
        // Create the OpenAI messages from chat history
        const openAIMessages = await createOpenAIMessages(
          messages, 
          newUserMessage, 
          memoryContext,
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
          memoryContext,
          shouldEnableFileOps,
          projectStructure
        );

        // Process the assistant's response
        const assistantResponse = response.choices[0].message.content;
        const fileOperations = response.choices[0].message.file_operations || [];
        
        // Process any file operations requested by the assistant
        if (fileOperations.length > 0) {
          console.log('Processing file operations:', fileOperations.length, fileOperations);
          const processedOperations = await processFileOperations(fileSystem, fileOperations);
          
          // Update file operation results for UI feedback
          if (processedOperations && processedOperations.length > 0) {
            setFileOperationResults(processedOperations as FileOperation[]);
            
            // Refresh files after operations
            await fileSystem.refreshFiles();
          }
        } else {
          console.log('No file operations to process');
        }
        
        // Store the response
        const newAssistantMessage = await storeAssistantMessage(user.id, assistantResponse);
        
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
    isTyping,
    setIsTyping,
    fileOperationResults,
    setFileOperationResults,
    sendMessage
  };
};
