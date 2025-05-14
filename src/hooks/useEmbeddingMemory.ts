
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '../types';

interface EmbeddingMemoryOptions {
  maxRecallResults?: number;
  similarityThreshold?: number;
  embeddingModel?: string;
}

export const useEmbeddingMemory = (options: EmbeddingMemoryOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const {
    maxRecallResults = 5,
    similarityThreshold = 0.70, // Lower threshold to retrieve more memories
    embeddingModel = 'text-embedding-ada-002'
  } = options;

  // Generate embedding for a piece of text using OpenAI's API
  const generateEmbedding = useCallback(async (text: string): Promise<number[] | null> => {
    try {
      if (!text || !text.trim()) return null;
      
      setIsProcessing(true);
      
      // Call the embedding edge function
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { text, model: embeddingModel }
      });
      
      if (error) throw error;
      
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [embeddingModel]);

  // Store a message with its embedding in the database - FIXED to handle string embeddings consistently
  const storeMemoryEmbedding = useCallback(async (content: string, messageType: string = 'chat', tags: string[] = []): Promise<void> => {
    if (!user || !content) return;
    
    try {
      // Generate embedding
      const embedding = await generateEmbedding(content);
      if (!embedding) return;
      
      // Convert number[] to string for storage - required by Supabase schema
      const embeddingString = JSON.stringify(embedding);
      
      // Store in database with embedding as string
      const { error } = await supabase
        .from('memory_embeddings')
        .insert({
          content,
          embedding: embeddingString,
          message_type: messageType,
          tags,
          user_id: user.id
        });
        
      if (error) throw error;
      
      console.log('Memory embedding stored successfully');
    } catch (error) {
      console.error('Error storing memory embedding:', error);
      toast({
        title: 'Memory Storage Error',
        description: 'Failed to store memory embedding. Continuing without it.',
        variant: 'destructive',
      });
    }
  }, [user, generateEmbedding, toast]);

  // Process message history to extract and store important information
  const processMessageHistory = useCallback(async (messages: Message[]): Promise<void> => {
    if (!user || messages.length === 0) return;
    
    try {
      console.log('Processing message history for embeddings...');
      
      // Find messages that have not been processed yet
      // In a real implementation, you might want to track which messages have been processed
      // For now, we'll just process the last few messages to avoid duplicates
      const recentMessages = messages.slice(-3);
      
      for (const message of recentMessages) {
        // Only process messages with content
        if (!message.content) continue;
        
        // Store different types of messages with appropriate tags
        if (message.role === 'assistant') {
          await storeMemoryEmbedding(
            message.content, 
            'chat', 
            ['assistant', 'response']
          );
        } else if (message.role === 'user') {
          await storeMemoryEmbedding(
            message.content, 
            'chat', 
            ['user', 'query']
          );
        }
      }
      
      console.log(`Processed ${recentMessages.length} recent messages for embedding storage`);
    } catch (error) {
      console.error('Error processing message history:', error);
    }
  }, [user, storeMemoryEmbedding]);

  // Retrieve relevant memories based on a query - IMPROVED search logic with better parsing
  const retrieveRelevantMemories = useCallback(async (query: string, limit: number = maxRecallResults): Promise<{content: string, similarity: number}[]> => {
    if (!user || !query) return [];
    
    try {
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      if (!queryEmbedding) return [];
      
      console.log('Fetching relevant memories with embedding');

      // Instead of using RPC, we'll perform a direct query and calculate similarities in JS
      try {
        // Get memories directly - request more to filter locally
        const { data, error } = await supabase
          .from('memory_embeddings')
          .select('content, embedding')
          .eq('user_id', user.id)
          .limit(100); // Get more than needed for better local filtering
        
        if (error || !data) {
          throw error || new Error('No data returned from direct query');
        }
        
        console.log(`Retrieved ${data.length} raw memories for similarity calculation`);
        
        // Calculate similarities locally with improved parsing
        const withSimilarity = data
          .filter(item => item.embedding !== null)
          .map(item => {
            try {
              // Parse embedding based on its type
              let itemEmbedding: number[];
              
              if (typeof item.embedding === 'string') {
                try {
                  itemEmbedding = JSON.parse(item.embedding);
                } catch (parseError) {
                  console.error('Error parsing embedding string:', parseError);
                  return { content: item.content, similarity: 0 };
                }
              } else if (Array.isArray(item.embedding)) {
                itemEmbedding = item.embedding;
              } else {
                console.warn('Unexpected embedding format:', typeof item.embedding);
                return { content: item.content, similarity: 0 };
              }
              
              // Calculate similarity only if we have a valid embedding
              if (Array.isArray(itemEmbedding) && itemEmbedding.length > 0) {
                return {
                  content: item.content,
                  similarity: calculateCosineSimilarity(queryEmbedding, itemEmbedding)
                };
              }
              return { content: item.content, similarity: 0 };
            } catch (e) {
              console.error('Error processing embedding:', e);
              return { content: item.content, similarity: 0 };
            }
          });
        
        // Sort by similarity, filter by threshold, and limit
        const filteredResults = withSimilarity
          .sort((a, b) => b.similarity - a.similarity)
          .filter(item => item.similarity > similarityThreshold);
        
        console.log(`Found ${filteredResults.length} relevant memories after filtering`);
        
        // Return limited results
        return filteredResults.slice(0, limit);
      } catch (error) {
        console.error('Error retrieving memories:', error);
        return [];
      }
    } catch (error) {
      console.error('Error retrieving relevant memories:', error);
      return [];
    }
  }, [user, generateEmbedding, maxRecallResults, similarityThreshold]);

  // Helper function for local similarity calculation
  const calculateCosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
  };

  // New helper method to extract explicit facts from content
  const extractFactsFromContent = useCallback(async (content: string): Promise<string[]> => {
    if (!content) return [];
    
    // Simple pattern matching for common fact patterns
    const facts: string[] = [];
    
    // Look for possessive patterns like "my X is Y"
    const possessivePattern = /my\s+([a-z]+(?:\s[a-z]+)?)\s+is\s+([a-z0-9]+(?:\s[a-z0-9]+)?)/gi;
    let possessiveMatch;
    while ((possessiveMatch = possessivePattern.exec(content)) !== null) {
      facts.push(`Sabrina's ${possessiveMatch[1]} is ${possessiveMatch[2]}`);
    }
    
    // Look for name patterns like "X is named Y"
    const namePattern = /([a-z]+(?:\s[a-z]+)?)\s+is\s+named\s+([a-z0-9]+(?:\s[a-z0-9]+)?)/gi;
    let nameMatch;
    while ((nameMatch = namePattern.exec(content)) !== null) {
      facts.push(`${nameMatch[1]} is named ${nameMatch[2]}`);
    }
    
    return facts;
  }, []);

  return {
    isProcessing,
    generateEmbedding,
    storeMemoryEmbedding,
    retrieveRelevantMemories,
    extractFactsFromContent,
    processMessageHistory // Added the missing function
  };
};
