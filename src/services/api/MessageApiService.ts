
import { Message } from '../../types';
import { supabase } from '@/integrations/supabase/client';

// Function to fetch chat messages from Supabase Edge Function
export const fetchMessages = async (userId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('messages', {
      method: 'GET',
      headers: {
        'x-user-id': userId
      }
    });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

// Function to store a user message in Supabase
export const storeUserMessage = async (userId: string, content: string): Promise<Message> => {
  try {
    const { data, error } = await supabase.functions.invoke('messages', {
      method: 'POST',
      body: { userId, content, role: 'user' }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing user message:', error);
    throw error;
  }
};

// Function to store an assistant message in Supabase
export const storeAssistantMessage = async (userId: string, content: string): Promise<Message> => {
  try {
    const { data, error } = await supabase.functions.invoke('messages', {
      method: 'POST',
      body: { userId, content, role: 'assistant' }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing assistant message:', error);
    throw error;
  }
};

// Function to delete all messages for a user in Supabase
export const deleteAllMessages = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('messages', {
      method: 'DELETE',
      body: { userId }
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting all messages:', error);
    throw error;
  }
};
