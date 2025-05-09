
import { supabase } from '../lib/supabase';
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
      const { error } = await supabase
        .from('memory')
        .upsert({
          user_id: userId,
          key,
          value,
          last_accessed: new Date().toISOString()
        }, {
          onConflict: 'user_id,key'
        });

      if (error) throw error;
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
        .single();

      if (error) throw error;
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
        recentMessages: messagesData || [],
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
        documents: documents.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          summary: doc.summary,
          lastAccessed: doc.lastAccessed
        }))
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
