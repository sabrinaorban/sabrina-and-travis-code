import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vdtogebrtoqnbbpjntgg.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a proper UUID for Supabase
const generateUUID = (): string => {
  return crypto.randomUUID();
};

// Set CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-id"
};

// Create a REST API endpoint for messages
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // GET method for fetching messages
  if (req.method === 'GET') {
    try {
      // Get userId from custom header
      const userId = req.headers.get('x-user-id');
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Fetching messages for user: ${userId}`);
      
      // Fetch messages from the database
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      console.log(`Found ${data?.length || 0} messages for user ${userId}`);
      
      return new Response(
        JSON.stringify(data || []), 
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error('Error creating message:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create message' }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error('Error deleting messages:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to delete messages' }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
  
  // Handle unsupported methods
  else {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
