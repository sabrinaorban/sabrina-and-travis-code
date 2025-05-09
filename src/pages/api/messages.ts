
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { generateUUID } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, NextApiResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET method for fetching messages
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Fetch messages from the database
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }
  
  // POST method for creating messages
  else if (req.method === 'POST') {
    try {
      const { userId, content, role } = req.body;
      
      if (!userId || !content || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Create new message in the database
      const message = {
        id: generateUUID(),
        user_id: userId,
        content,
        role,
        timestamp: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select();
        
      if (error) throw error;
      
      return res.status(201).json(data?.[0] || message);
    } catch (error) {
      console.error('Error creating message:', error);
      return res.status(500).json({ error: 'Failed to create message' });
    }
  }
  
  // DELETE method for clearing all messages
  else if (req.method === 'DELETE') {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Delete all messages for the user
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId);
        
      if (error) throw error;
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting messages:', error);
      return res.status(500).json({ error: 'Failed to delete messages' });
    }
  }
  
  // Handle unsupported methods
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
