
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
    similarityThreshold = 0.75,
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

  // Store a message with its embedding in the database
  const storeMemoryEmbedding = useCallback(async (content: string, messageType: string = 'chat', tags: string[] = []): Promise<void> => {
    if (!user || !content) return;
    
    try {
      // Generate embedding
      const embedding = await generateEmbedding(content);
      if (!embedding) return;
      
      // Store in database - FIXED: Storing as proper vector type, not as a string
      const { error } = await supabase
        .from('memory_embeddings')
        .insert({
          content,
          embedding,
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

  // Retrieve relevant memories based on a query - IMPROVED search logic
  const retrieveRelevantMemories = useCallback(async (query: string, limit: number = maxRecallResults): Promise<{content: string, similarity: number}[]> => {
    if (!user || !query) return [];
    
    try {
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      if (!queryEmbedding) return [];
      
      console.log('Fetching relevant memories with embedding');
      
      // FIXED: Using the match_memories function properly
      const { data, error } = await supabase.rpc(
        'match_memories',
        {
          query_embedding: queryEmbedding,
          match_threshold: similarityThreshold,
          match_count: limit,
          user_id: user.id
        }
      );
      
      if (error) {
        console.error('RPC match_memories error:', error);
        
        // Fallback to manual calculation if RPC fails
        console.log('Falling back to direct query and manual calculation');
        return await performManualMemoryLookup(queryEmbedding, limit);
      }
      
      console.log(`Retrieved ${data?.length || 0} memory matches via RPC`);
      return data || [];
    } catch (error) {
      console.error('Error retrieving relevant memories:', error);
      // Try the manual lookup as fallback
      console.log('Error occurred, falling back to direct query');
      const queryEmbedding = await generateEmbedding(query);
      if (queryEmbedding) {
        return await performManualMemoryLookup(queryEmbedding, limit);
      }
      return [];
    }
  }, [user, generateEmbedding, maxRecallResults, similarityThreshold]);
  
  // Helper method for fallback calculation when RPC fails
  const performManualMemoryLookup = async (queryEmbedding: number[], limit: number): Promise<{content: string, similarity: number}[]> => {
    if (!user) return [];
    
    try {
      // Get memories directly
      const { data, error } = await supabase
        .from('memory_embeddings')
        .select('content, embedding')
        .eq('user_id', user.id)
        .limit(50); // Get more than needed for local filtering
      
      if (error || !data) {
        throw error || new Error('No data returned from direct query');
      }
      
      // Calculate similarities locally
      const withSimilarity = data
        .filter(item => item.embedding !== null)
        .map(item => {
          // Ensure proper parsing of embeddings
          const itemEmbedding = typeof item.embedding === 'string' 
            ? JSON.parse(item.embedding) 
            : item.embedding;
          
          return {
            content: item.content,
            similarity: calculateCosineSimilarity(queryEmbedding, itemEmbedding as number[])
          };
        });
      
      // Sort by similarity and limit
      return withSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .filter(item => item.similarity > similarityThreshold)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in manual memory lookup:', error);
      return [];
    }
  };
  
  // Create memory embeddings for recent messages in bulk
  const processMessageHistory = useCallback(async (messages: Message[]): Promise<void> => {
    if (!user || !messages.length) return;
    
    try {
      setIsProcessing(true);
      console.log(`Processing ${messages.length} messages for embedding generation`);
      
      // Process in batches to avoid overloading the API
      const batchSize = 5;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        // Process batch concurrently
        await Promise.all(batch.map(async (message) => {
          // Skip very short messages
          if (message.content.length < 10) return;
          
          try {
            await storeMemoryEmbedding(
              message.content,
              'chat',
              [message.role]
            );
          } catch (error) {
            console.error(`Error processing message ${message.id}:`, error);
            // Continue with next message
          }
        }));
        
        // Pause between batches
        if (i + batchSize < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('Message history processing complete');
    } catch (error) {
      console.error('Error processing message history:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [user, storeMemoryEmbedding]);

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

  return {
    isProcessing,
    generateEmbedding,
    storeMemoryEmbedding,
    retrieveRelevantMemories,
    processMessageHistory
  };
};
