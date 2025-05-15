
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// CORS headers to enable cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get Supabase URL and key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Process GET requests (fetch messages)
    if (req.method === 'GET') {
      const userId = req.headers.get('x-user-id');
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log(`Fetching messages for user: ${userId}`);
      
      // Fetch messages for the specified user
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} messages for user: ${userId}`);
      
      return new Response(
        JSON.stringify(data),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Process POST requests (create new message)
    else if (req.method === 'POST') {
      const body = await req.json();
      const { userId, content, role, id, timestamp, emotion } = body;
      
      if (!userId || !content || !role) {
        return new Response(
          JSON.stringify({ error: 'User ID, content, and role are required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Generate a timestamp for the message if not provided
      const messageTimestamp = timestamp || new Date().toISOString();
      // Generate an ID if not provided
      const messageId = id || crypto.randomUUID();
      
      console.log(`Storing message for user ${userId}: id=${messageId.substring(0,8)}, role=${role}`);
      
      // Insert the message into the database
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            id: messageId,
            user_id: userId,
            content,
            role,
            timestamp: messageTimestamp,
            emotion: emotion || null
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error storing message:', error);
        throw error;
      }
      
      console.log(`Message stored successfully: ${messageId.substring(0,8)}`);
      
      return new Response(
        JSON.stringify(data),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Process DELETE requests (delete messages)
    else if (req.method === 'DELETE') {
      const { userId } = await req.json();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log(`Deleting all messages for user: ${userId}`);
      
      // Delete all messages for the specified user
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting messages:', error);
        throw error;
      }
      
      console.log(`Successfully deleted messages for user: ${userId}`);
      
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Handle unsupported methods
    else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error in messages function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
