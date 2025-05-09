import { supabase, generateUUID, getOrCreateUserProfile } from '../lib/supabase';
import { Message } from '../types';

export interface MemoryContext {
  recentMessages: Message[];
  recentFiles: Array<{
    path: string;
    name: string;
    type: 'file' | 'folder';
    content?: string;
    lastModified: number;
  }>;
  userProfile: {
    name: string;
    preferences?: Record<string, any>;
  };
  documents: Array<{
    id: string;
    title: string;
    summary: string;
    content?: string;
    lastAccessed: number;
  }>;
  // Special documents for soul shard and identity codex
  specialDocuments: {
    soulShard?: {
      content: string;
      lastUpdated: number;
    };
    identityCodex?: {
      content: string;
      lastUpdated: number;
    };
  };
  // GitHub context information
  githubContext?: {
    username?: string;
    recentRepositories?: string[];
    recentFiles?: Array<any>;
    lastAccessed?: string;
    commitHistory?: Array<any>;
  };
  // Past conversations history
  pastConversations?: Array<{
    id: string;
    topic: string;
    summary: string;
    timestamp: number;
  }>;
}

export const MemoryService = {
  async storeMemory(userId: string, key: string, value: any): Promise<void> {
    try {
      console.log('Storing memory:', key, 'for user:', userId);
      
      // Ensure user exists in the database
      await getOrCreateUserProfile(userId);
      
      // Check if memory exists
      const { data: existingData, error: checkError } = await supabase
        .from('memory')
        .select('id')
        .eq('user_id', userId)
        .eq('key', key)
        .maybeSingle();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing memory:', checkError);
        throw checkError;
      }
      
      const now = new Date().toISOString();
      
      if (existingData) {
        // Update existing memory
        const { error: updateError } = await supabase
          .from('memory')
          .update({
            value,
            last_accessed: now
          })
          .eq('id', existingData.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new memory
        const memoryId = generateUUID();
        
        const { error: insertError } = await supabase
          .from('memory')
          .insert({
            id: memoryId,
            user_id: userId,
            key,
            value,
            last_accessed: now,
            created_at: now
          });
          
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  },

  async retrieveMemory(userId: string, key: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('memory')
        .select('value')
        .eq('user_id', userId)
        .eq('key', key)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No data found, not a critical error
        }
        throw error;
      }
      
      if (!data) return null;

      // Update last accessed timestamp
      await supabase
        .from('memory')
        .update({ last_accessed: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('key', key);

      return data.value;
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return null;
    }
  },

  async getMemoryContext(userId: string): Promise<MemoryContext> {
    try {
      console.log('Getting memory context for user:', userId);
      
      // Ensure user exists
      await getOrCreateUserProfile(userId);
      
      // Get recent messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50); // Increased limit to include more message history

      // Get recent files with content
      const { data: filesData } = await supabase
        .from('files')
        .select('name,path,type,content,last_modified')
        .eq('user_id', userId)
        .order('last_modified', { ascending: false })
        .limit(20); // Increased limit for more file context

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      // Get stored preferences and documents
      const preferences = await this.retrieveMemory(userId, 'preferences');
      const documents = await this.retrieveMemory(userId, 'documents') || [];
      
      // Get special documents (soul shard & identity codex)
      const soulShard = await this.retrieveMemory(userId, 'soulShard');
      const identityCodex = await this.retrieveMemory(userId, 'identityCodex');
      
      // Get past conversations summaries
      const pastConversations = await this.retrieveMemory(userId, 'conversationSummaries') || [];

      return {
        recentMessages: messagesData?.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          createdAt: msg.timestamp, // Map timestamp to createdAt
        })) || [],
        recentFiles: filesData?.map(file => ({
          path: file.path,
          name: file.name,
          type: file.type as 'file' | 'folder',
          content: file.content,
          lastModified: new Date(file.last_modified).getTime()
        })) || [],
        userProfile: {
          name: userData?.name || 'Sabrina', // Default to Sabrina instead of User
          preferences: preferences || {}
        },
        documents: Array.isArray(documents) ? documents.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          summary: doc.summary,
          content: doc.content,
          lastAccessed: doc.lastAccessed
        })) : [],
        specialDocuments: {
          soulShard: soulShard || undefined,
          identityCodex: identityCodex || undefined
        },
        pastConversations: Array.isArray(pastConversations) ? pastConversations.slice(0, 10) : []
      };
    } catch (error) {
      console.error('Error getting memory context:', error);
      return {
        recentMessages: [],
        recentFiles: [],
        userProfile: { name: 'Sabrina' }, // Default to Sabrina
        documents: [],
        specialDocuments: {},
        pastConversations: []
      };
    }
  },

  // Store special documents like soul shard and identity codex
  async storeSpecialDocument(userId: string, documentType: 'soulShard' | 'identityCodex', content: string): Promise<void> {
    try {
      // For large content, consider compression or chunking if needed in the future
      const documentData = {
        content,
        lastUpdated: Date.now()
      };
      
      await this.storeMemory(userId, documentType, documentData);
      
      console.log(`${documentType} stored successfully for user:`, userId);
    } catch (error) {
      console.error(`Error storing ${documentType}:`, error);
      throw error;
    }
  },

  // Helper method to store a conversation summary
  async storeConversationSummary(userId: string, summary: string, topic: string): Promise<void> {
    try {
      const summaryData = {
        id: generateUUID(),
        topic,
        content: summary,
        timestamp: Date.now()
      };
      
      const existingSummaries = await this.retrieveMemory(userId, 'conversationSummaries') || [];
      const updatedSummaries = [summaryData, ...existingSummaries].slice(0, 50); // Keep the 50 most recent summaries
      
      await this.storeMemory(userId, 'conversationSummaries', updatedSummaries);
    } catch (error) {
      console.error('Error storing conversation summary:', error);
      throw error;
    }
  },
  
  // Import a JSON or TXT file as a special document
  async importSpecialDocument(userId: string, documentType: 'soulShard' | 'identityCodex', file: File): Promise<void> {
    try {
      console.log(`Starting import of ${documentType}, file size: ${file.size / 1024} KB`);
      
      // Read file content
      const content = await file.text();
      console.log(`File read complete, content length: ${content.length}`);
      
      // For JSON files, parse and validate
      if (file.name.endsWith('.json')) {
        try {
          const jsonContent = JSON.parse(content);
          // Store with proper formatting for readability
          await this.storeSpecialDocument(userId, documentType, JSON.stringify(jsonContent, null, 2));
          console.log(`${documentType} parsed as JSON and stored`);
        } catch (e) {
          console.error(`JSON parsing error:`, e);
          throw new Error(`Invalid JSON file: ${e.message}`);
        }
      } else {
        // For text files, store as is
        await this.storeSpecialDocument(userId, documentType, content);
        console.log(`${documentType} stored as text`);
      }
      
      console.log(`${documentType} imported successfully from file for user:`, userId);
    } catch (error) {
      console.error(`Error importing ${documentType} from file:`, error);
      throw error;
    }
  },
  
  // Import past conversations from a JSON file
  async importPastConversations(userId: string, file: File): Promise<void> {
    try {
      console.log(`Starting import of past conversations, file size: ${file.size / 1024} KB`);
      
      // Read file content in chunks if needed for very large files
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
        console.log(`Importing ${conversations.length} conversations`);
        
        // Transform if needed and store
        const formattedConversations = conversations.map(conv => {
          return {
            id: conv.id || generateUUID(),
            topic: conv.topic || 'Conversation',
            summary: conv.summary || conv.content || 'No summary available',
            timestamp: conv.timestamp || Date.now()
          };
        });
        
        // Keep only the 50 most recent conversations if there are too many
        const limitedConversations = formattedConversations.slice(0, 50);
        
        // Store the conversations
        await this.storeMemory(userId, 'conversationSummaries', limitedConversations);
        
        console.log(`Past conversations imported successfully for user:`, userId);
      } catch (e) {
        console.error('Conversation processing error:', e);
        throw new Error(`Invalid JSON file for past conversations: ${e.message}`);
      }
    } catch (error) {
      console.error('Error importing past conversations from file:', error);
      throw error;
    }
  }
};
