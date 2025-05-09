
// Implement message handling Edge Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

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
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const url = new URL(req.url);
    
    // Header based method
    let userId = req.headers.get('x-user-id');
    
    if (!userId) {
      // If not in headers, try to get from URL or body
      if (req.method === 'GET') {
        // Legacy URL parameter approach
        userId = url.searchParams.get('userId');
      } else {
        // Try to get from body
        const { userId: bodyUserId } = await req.json();
        userId = bodyUserId;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing user ID in request' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // GET: Fetch messages
    if (req.method === 'GET') {
      // Query messages for user
      console.log(`Fetching messages for user: ${userId}`);
      
      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50);
        
      if (error) throw error;
      
      console.log(`Found ${data.length} messages for user ${userId}`);
      
      return new Response(
        JSON.stringify(data),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // POST: Create a new message
    else if (req.method === 'POST') {
      // Parse the request body
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const { content, role } = body;
      
      if (!content || !role) {
        return new Response(
          JSON.stringify({ error: 'Missing content or role in request body' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Insert the message
      const { data, error } = await supabaseClient
        .from('messages')
        .insert([
          { 
            user_id: userId, 
            content, 
            role 
          }
        ])
        .select();
        
      if (error) throw error;
      
      return new Response(
        JSON.stringify(data[0]),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // DELETE: Remove all messages for a user
    else if (req.method === 'DELETE') {
      const { error } = await supabaseClient
        .from('messages')
        .delete()
        .eq('user_id', userId);
        
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
