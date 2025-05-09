
import { supabase, generateUUID, getOrCreateUserProfile } from '../lib/supabase';
import { Message } from '../types';

export interface MemoryContext {
  recentMessages: Message[];
  recentFiles: Array<{
    path: string;
    name: string;
    type: 'file' | 'folder';
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
    lastAccessed: number;
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
        .limit(20);

      // Get recent files
      const { data: filesData } = await supabase
        .from('files')
        .select('name,path,type,last_modified')
        .eq('user_id', userId)
        .order('last_modified', { ascending: false })
        .limit(10);

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      // Get stored preferences and documents
      const preferences = await this.retrieveMemory(userId, 'preferences');
      const documents = await this.retrieveMemory(userId, 'documents') || [];

      return {
        recentMessages: messagesData?.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime()
        })) || [],
        recentFiles: filesData?.map(file => ({
          path: file.path,
          name: file.name,
          type: file.type as 'file' | 'folder',
          lastModified: new Date(file.last_modified).getTime()
        })) || [],
        userProfile: {
          name: userData?.name || 'User',
          preferences: preferences || {}
        },
        documents: Array.isArray(documents) ? documents.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          summary: doc.summary,
          lastAccessed: doc.lastAccessed
        })) : []
      };
    } catch (error) {
      console.error('Error getting memory context:', error);
      return {
        recentMessages: [],
        recentFiles: [],
        userProfile: { name: 'User' },
        documents: []
      };
    }
  }
};
