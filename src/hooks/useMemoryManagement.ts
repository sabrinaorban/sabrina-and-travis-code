import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGitHub } from '../contexts/github';
import { MemoryService, MemoryContext as MemoryContextType } from '../services/MemoryService';
import { useToast } from './use-toast';
import { Message } from '../types';
import { storeAssistantMessage } from '../services/ChatService';

export const useMemoryManagement = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const [memoryContext, setMemoryContext] = useState<MemoryContextType | null>(null);
  const { user } = useAuth();
  const github = useGitHub();
  const { toast } = useToast();

  // Enhanced memory refresh function with better error handling
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
      console.log('Memory context refreshed successfully');
      return context;
    } catch (error) {
      console.error('Error refreshing memory context:', error);
      toast({
        title: 'Memory Error',
        description: 'Failed to load memory context. Retrying...',
        variant: 'destructive',
      });
      
      // Retry once after a short delay
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryContext = await MemoryService.getMemoryContext(user.id);
        setMemoryContext(retryContext);
        return retryContext;
      } catch (retryError) {
        console.error('Error retrying memory context refresh:', retryError);
        return null;
      }
    }
  }, [user, github.authState.isAuthenticated, toast]);

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
    }
  };
  
  // Enhanced past conversations upload with improved processing and indexing
  const uploadPastConversations = async (file: File) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload past conversations',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      console.log(`Starting enhanced import of past conversations, file size: ${file.size / 1024} KB`);
      
      // Read file content with progress tracking for large files
      const content = await file.text();
      console.log(`File read complete, content length: ${content.length}`);
      
      try {
        let conversations;
        
        try {
          conversations = JSON.parse(content);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error(`Could not parse JSON file: ${parseError.message}`);
        }
        
        // Validate the conversations format
        if (!Array.isArray(conversations)) {
          throw new Error('Past conversations must be an array');
        }
        
        // Log the number of conversations being imported
        console.log(`Importing and optimizing ${conversations.length} conversations`);
        
        // Enhanced transformation with better memory indexing and prioritization
        const formattedConversations = conversations.map(conv => {
          // Extract keywords for better memory recall
          const keywords = extractKeywordsFromConversation(conv);
          
          return {
            id: conv.id || generateUUID(),
            topic: conv.topic || 'Conversation',
            summary: conv.summary || conv.content || 'No summary available',
            timestamp: conv.timestamp || Date.now(),
            keywords: keywords,
            priority: calculateConversationPriority(conv),
            content: conv.content || conv.summary || ''
          };
        });
        
        // Sort by priority and keep the most important conversations
        const sortedConversations = formattedConversations
          .sort((a, b) => b.priority - a.priority || b.timestamp - a.timestamp);
        
        // Keep more conversations (100 instead of 50) for better recall
        const limitedConversations = sortedConversations.slice(0, 100);
        
        // Store the conversations
        await MemoryService.storeMemory(user.id, 'conversationSummaries', limitedConversations);
        
        // Also store a searchable index for faster recall
        const conversationIndex = createConversationSearchIndex(limitedConversations);
        await MemoryService.storeMemory(user.id, 'conversationSearchIndex', conversationIndex);
        
        // Refresh memory context after upload
        await refreshMemoryContext();
        
        // Add a message confirming the upload with enhanced capabilities
        const message = await storeAssistantMessage(
          user.id, 
          "I've integrated your past conversations into my memory with enhanced recall capabilities. I can now better remember specific details from our previous interactions when you ask about them. The conversations have been indexed for quick retrieval and prioritized for relevance."
        );
        
        setMessages(prev => [...prev, message]);
        
        toast({
          title: 'Success',
          description: `${limitedConversations.length} past conversations uploaded and integrated with enhanced recall`,
        });
        
        console.log(`Past conversations imported successfully for user:`, user.id);
      } catch (e) {
        console.error('Conversation processing error:', e);
        throw new Error(`Invalid JSON file for past conversations: ${e.message}`);
      }
    } catch (error: any) {
      console.error('Error importing past conversations from file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload past conversations',
        variant: 'destructive',
      });
    }
  };

  // Helper function to extract keywords from conversation for better recall
  const extractKeywordsFromConversation = (conversation: any): string[] => {
    const content = conversation.content || conversation.summary || '';
    const topic = conversation.topic || '';
    
    // Simple keyword extraction (in real implementation, could use NLP techniques)
    const allText = `${topic} ${content}`.toLowerCase();
    
    // Remove common words and split
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by'];
    const words = allText.split(/\W+/).filter(word => 
      word.length > 2 && !commonWords.includes(word)
    );
    
    // Remove duplicates and return
    return [...new Set(words)];
  };

  // Helper function to calculate conversation priority
  const calculateConversationPriority = (conversation: any): number => {
    let priority = 0;
    
    // Prioritize conversations with more content
    if (conversation.content && conversation.content.length > 500) priority += 2;
    
    // Prioritize conversations with specific topics
    const topicLowercase = (conversation.topic || '').toLowerCase();
    if (topicLowercase.includes('important') || 
        topicLowercase.includes('key') ||
        topicLowercase.includes('remember')) {
      priority += 3;
    }
    
    // Prioritize more recent conversations
    if (conversation.timestamp) {
      const ageInDays = (Date.now() - conversation.timestamp) / (1000 * 60 * 60 * 24);
      if (ageInDays < 7) priority += 2;
      else if (ageInDays < 30) priority += 1;
    }
    
    return priority;
  };

  // Helper function to create a searchable index for conversations
  const createConversationSearchIndex = (conversations: any[]): any => {
    const index: Record<string, string[]> = {};
    
    // Create simple inverted index
    conversations.forEach(conv => {
      (conv.keywords || []).forEach(keyword => {
        if (!index[keyword]) index[keyword] = [];
        index[keyword].push(conv.id);
      });
    });
    
    return {
      lastUpdated: Date.now(),
      keywordMap: index
    };
  };

  // Helper function to generate UUID (borrowed from existing code)
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  return {
    memoryContext,
    refreshMemoryContext,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  };
};
