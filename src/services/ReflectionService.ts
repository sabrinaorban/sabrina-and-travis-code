
import { supabase } from '../lib/supabase';
import { Reflection } from '../types/reflection';
import { Message } from '../types';
import { MemoryContext } from './MemoryService';

export const ReflectionService = {
  // Generate a new reflection using the edge function
  async generateReflection(
    userId: string, 
    type: 'weekly' | 'soulshard' | 'custom' = 'weekly', 
    messageCount: number = 20
  ): Promise<Reflection> {
    try {
      const { data, error } = await supabase.functions.invoke('reflect', {
        body: { 
          userId, 
          type,
          userMessages: messageCount 
        }
      });
      
      if (error) {
        console.error('Error generating reflection:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in generateReflection:', error);
      throw error;
    }
  },
  
  // Get all reflections for a user
  async getReflections(userId: string): Promise<Reflection[]> {
    try {
      const { data, error } = await supabase
        .from('reflections')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching reflections:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getReflections:', error);
      throw error;
    }
  },
  
  // Get the most recent reflection
  async getLatestReflection(userId: string, type?: string): Promise<Reflection | null> {
    try {
      const query = supabase
        .from('reflections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
        
      // Add type filter if provided
      if (type) {
        query.eq('type', type);
      }
      
      const { data, error } = await query;
        
      if (error) {
        console.error('Error fetching latest reflection:', error);
        throw error;
      }
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error in getLatestReflection:', error);
      throw error;
    }
  },
  
  // Update Travis's soulshard based on a reflection
  async updateSoulShard(userId: string, updates: string): Promise<void> {
    try {
      // First get the current soulshard
      const { data: currentSoulShard, error: fetchError } = await supabase
        .from('memory')
        .select('value')
        .eq('user_id', userId)
        .eq('key', 'soulShard')
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching soulshard:', fetchError);
        throw fetchError;
      }
      
      let updatedSoulShard;
      
      // Parse updates if they're in JSON format
      try {
        const updatesObj = JSON.parse(updates);
        
        // If current soulshard exists, merge updates
        if (currentSoulShard?.value?.content) {
          try {
            const currentContent = JSON.parse(currentSoulShard.value.content);
            updatedSoulShard = {
              content: JSON.stringify({
                ...currentContent,
                ...updatesObj
              }),
              lastUpdated: Date.now()
            };
          } catch (parseError) {
            console.error('Error parsing current soulshard:', parseError);
            // If current content isn't valid JSON, use the updates as-is
            updatedSoulShard = {
              content: updates,
              lastUpdated: Date.now()
            };
          }
        } else {
          // No current soulshard, create a new one
          updatedSoulShard = {
            content: updates,
            lastUpdated: Date.now()
          };
        }
      } catch (jsonError) {
        // Updates aren't in JSON format, store as raw text
        console.error('Updates not in JSON format:', jsonError);
        updatedSoulShard = {
          content: updates,
          lastUpdated: Date.now()
        };
      }
      
      // Store the updated soulshard
      const { error: updateError } = await supabase
        .from('memory')
        .upsert({
          user_id: userId,
          key: 'soulShard',
          value: updatedSoulShard,
          last_accessed: new Date().toISOString()
        });
      
      if (updateError) {
        console.error('Error updating soulshard:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Error in updateSoulShard:', error);
      throw error;
    }
  },
  
  // Generate a soul reflection and update the soulshard
  async generateSoulReflection(userId: string, memoryContext: MemoryContext | null): Promise<Reflection> {
    try {
      // Generate a soul reflection
      const reflection = await this.generateReflection(userId, 'soulshard', 30);
      
      // Extract JSON from the reflection if possible
      let soulShardUpdates = reflection.content;
      
      // Try to find JSON content in the reflection
      const jsonMatch = reflection.content.match(/```json\n([\s\S]*?)\n```/) || 
                        reflection.content.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        soulShardUpdates = jsonMatch[0].replace(/```json\n|```/g, '');
        
        // Validate that it's proper JSON
        try {
          JSON.parse(soulShardUpdates);
        } catch (e) {
          console.error('Invalid JSON in reflection:', e);
          // If invalid, use the whole reflection content
          soulShardUpdates = reflection.content;
        }
      }
      
      // Update the soulshard with the reflection content
      await this.updateSoulShard(userId, soulShardUpdates);
      
      return reflection;
    } catch (error) {
      console.error('Error in generateSoulReflection:', error);
      throw error;
    }
  }
};
