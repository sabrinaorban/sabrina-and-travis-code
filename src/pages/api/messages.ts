
import { supabase } from '@/lib/supabase';
import { generateUUID } from '@/lib/supabase';

// Create a REST API endpoint for messages
Deno.serve(async (req) => {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  // GET method for fetching messages
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }), 
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }
      
      // Fetch messages from the database
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      return new Response(
        JSON.stringify(data || []), 
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }), 
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
  }
  
  // POST method for creating messages
  else if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { userId, content, role } = body;
      
      if (!userId || !content || !role) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }), 
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
        );
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
      
      return new Response(
        JSON.stringify(data?.[0] || message), 
        { status: 201, headers: { ...headers, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error('Error creating message:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create message' }), 
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
  }
  
  // DELETE method for clearing all messages
  else if (req.method === 'DELETE') {
    try {
      const body = await req.json();
      const { userId } = body;
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }), 
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }
      
      // Delete all messages for the user
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId);
        
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true }), 
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error('Error deleting messages:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to delete messages' }), 
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
  }
  
  // Handle unsupported methods
  else {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
