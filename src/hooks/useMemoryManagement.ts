
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
    }
  };

  return {
    memoryContext,
    refreshMemoryContext,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  };
};
