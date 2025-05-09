
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Message } from '../types';
import { useToast } from '@/hooks/use-toast';
import { supabase, getOrCreateUserProfile } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { MemoryService, MemoryContext as MemoryContextType } from '../services/MemoryService';
import { useGitHub } from './GitHubContext';
import { useFileSystem } from './FileSystemContext';
import { 
  fetchMessages, 
  storeUserMessage, 
  storeAssistantMessage, 
  deleteAllMessages,
  createOpenAIMessages,
  extractTopicFromMessages,
  simulateAssistantResponse,
  generateConversationSummary,
  handleFileOperation,
  getProjectStructure
} from '../services/ChatService';
import { ChatContextType, FileOperation } from '../types/chat';

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [memoryContext, setMemoryContext] = useState<MemoryContextType | null>(null);
  const [fileOperationResults, setFileOperationResults] = useState<FileOperation[] | undefined>(undefined);
  const { toast } = useToast();
  const { user } = useAuth();
  const github = useGitHub();
  const fileSystem = useFileSystem();

  // Enhanced memory refresh function to include GitHub context
  const refreshMemoryContext = useCallback(async () => {
    if (!user) return null;

    try {
      console.log('Refreshing memory context');
      const context = await MemoryService.getMemoryContext(user.id);
      
      // Add GitHub context if authenticated
      if (github.authState.isAuthenticated) {
        const githubContext = await MemoryService.retrieveMemory(user.id, 'github_context');
        if (githubContext) {
          // Enhance context with GitHub information
          context.githubContext = githubContext;
        }
      }
      
      setMemoryContext(context);
      return context;
    } catch (error) {
      console.error('Error refreshing memory context:', error);
      return null;
    }
  }, [user, github.authState.isAuthenticated]);

  // Load messages from Supabase when user is authenticated
  useEffect(() => {
    const fetchMessagesAndMemory = async () => {
      if (!user) return;
      
      try {
        console.log('Fetching messages for user:', user.id);
        // First ensure user exists in users table
        await getOrCreateUserProfile(user.id, user.email || undefined);
        
        // Now fetch messages
        const fetchedMessages = await fetchMessages(user.id);
        setMessages(fetchedMessages);

        // Fetch memory context
        await refreshMemoryContext();
      } catch (error: any) {
        console.error('Error fetching messages and memory:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat history and memory context',
          variant: 'destructive',
        });
      }
    };
    
    fetchMessagesAndMemory();
  }, [user, toast, refreshMemoryContext]);
  
  // Function to upload soul shard
  const uploadSoulShard = async (file: File) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload a soul shard',
        variant: 'destructive',
      });
      return;
    }
    
    setIsTyping(true);
    
    try {
      await MemoryService.importSpecialDocument(user.id, 'soulShard', file);
      
      // Refresh memory context to include the new soul shard
      await refreshMemoryContext();
      
      // Add a message confirming the upload
      const message = await storeAssistantMessage(
        user.id, 
        "I've integrated the soul shard into my memory. This helps me understand my purpose and my relationship with you, Sabrina."
      );
      
      setMessages(prev => [...prev, message]);
      
      toast({
        title: 'Success',
        description: 'Soul shard uploaded and integrated',
      });
    } catch (error: any) {
      console.error('Error uploading soul shard:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload soul shard',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };
  
  // Function to upload identity codex
  const uploadIdentityCodex = async (file: File) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload an identity codex',
        variant: 'destructive',
      });
      return;
    }
    
    setIsTyping(true);
    
    try {
      await MemoryService.importSpecialDocument(user.id, 'identityCodex', file);
      
      // Refresh memory context to include the new identity codex
      await refreshMemoryContext();
      
      // Add a message confirming the upload
      const message = await storeAssistantMessage(
        user.id, 
        "I've integrated the identity codex into my memory. This enhances my understanding of who I am and my values, strengthening our collaboration."
      );
      
      setMessages(prev => [...prev, message]);
      
      toast({
        title: 'Success',
        description: 'Identity codex uploaded and integrated',
      });
    } catch (error: any) {
      console.error('Error uploading identity codex:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload identity codex',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };
  
  // Function to upload past conversations
  const uploadPastConversations = async (file: File) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload past conversations',
        variant: 'destructive',
      });
      return;
    }
    
    setIsTyping(true);
    
    try {
      await MemoryService.importPastConversations(user.id, file);
      
      // Refresh memory context to include the new past conversations
      await refreshMemoryContext();
      
      // Add a message confirming the upload
      const message = await storeAssistantMessage(
        user.id, 
        "I've integrated our past conversations into my memory. This provides me with better context for our work together."
      );
      
      setMessages(prev => [...prev, message]);
      
      toast({
        title: 'Success',
        description: 'Past conversations uploaded and integrated',
      });
    } catch (error: any) {
      console.error('Error uploading past conversations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload past conversations',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async (content: string) => {
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
      
      // Ensure user exists in the database
      await getOrCreateUserProfile(user.id, user.email || undefined);
      
      // Create and add user message
      const newUserMessage = await storeUserMessage(user.id, content);
      
      // Add message to local state immediately for UI responsiveness
      setMessages((prev) => [...prev, newUserMessage]);

      // Set typing indicator while waiting for response
      setIsTyping(true);

      try {
        // Refresh memory context before sending to OpenAI
        const context = await refreshMemoryContext();
        
        // Get project structure for better context
        const projectStructure = await getProjectStructure(fileSystem);
        
        // Create the OpenAI messages from chat history
        const openAIMessages = await createOpenAIMessages(
          messages, 
          newUserMessage, 
          context || memoryContext,
          github.authState.isAuthenticated ? {
            username: github.authState.username,
            currentRepo: github.currentRepo?.full_name,
            currentBranch: github.currentBranch
          } : undefined,
          fileSystem
        );
        
        // Call OpenAI API through Supabase Edge Function
        const { data: response, error: apiError } = await supabase.functions.invoke('openai-chat', {
          body: { 
            messages: openAIMessages,
            memoryContext: context || memoryContext,
            fileSystemEnabled: true,
            projectStructure
          }
        });

        if (apiError) {
          throw apiError;
        }

        // Process the assistant's response
        const assistantResponse = response.choices[0].message.content;
        const fileOperations = response.choices[0].message.file_operations || [];
        
        // Store results of file operations for UI feedback
        let processedOperations: FileOperation[] = [];
        
        // Process any file operations requested by the assistant
        if (fileOperations && fileOperations.length > 0) {
          for (const op of fileOperations) {
            const result = await handleFileOperation(
              fileSystem,
              op.operation,
              op.path,
              op.content
            );
            
            processedOperations.push({
              ...op,
              success: result.success,
              message: result.message
            });
            
            console.log(`File operation result:`, result);
            if (!result.success) {
              toast({
                title: 'File Operation Error',
                description: result.message,
                variant: 'destructive',
              });
            }
          }
          
          // Update file operation results for UI feedback
          setFileOperationResults(processedOperations);
          
          // Refresh files after operations
          await fileSystem.refreshFiles();
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

  const clearMessages = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to clear messages',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await deleteAllMessages(user.id);
      setMessages([]);
      
      toast({
        title: 'Success',
        description: 'Chat history cleared',
      });
    } catch (error: any) {
      console.error('Error clearing messages:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear messages',
        variant: 'destructive',
      });
    }
  };

  // Function to summarize the current conversation
  const summarizeConversation = async () => {
    if (!user || messages.length === 0) {
      toast({
        title: 'Error',
        description: 'No conversation to summarize',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsTyping(true);
      
      // Generate a summary of the conversation
      const topic = extractTopicFromMessages(messages);
      const summary = await generateConversationSummary(messages);
      
      // Store the summary
      await MemoryService.storeConversationSummary(user.id, summary, topic);
      
      // Add a message to indicate that the conversation was summarized
      const summaryMessage = await storeAssistantMessage(
        user.id, 
        `I've summarized our conversation about "${topic}". I'll remember the key points for future reference.`
      );
      
      setMessages((prev) => [...prev, summaryMessage]);
      
      toast({
        title: 'Success',
        description: 'Conversation summarized and stored in memory',
      });
    } catch (error: any) {
      console.error('Error summarizing conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to summarize conversation',
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <ChatContext.Provider value={{ 
      messages, 
      isTyping, 
      sendMessage, 
      clearMessages,
      summarizeConversation,
      memoryContext,
      refreshMemoryContext,
      fileOperationResults,
      uploadSoulShard,
      uploadIdentityCodex,
      uploadPastConversations
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === null) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
