
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Verify the user's session
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user's context data
    const [messagesResponse, filesResponse, userResponse, memoryResponse] = await Promise.all([
      // Get recent messages
      supabaseAdmin
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(50),
        
      // Get recent files
      supabaseAdmin
        .from('files')
        .select('name,path,type,last_modified,content')
        .eq('user_id', user.id)
        .eq('type', 'file')
        .order('last_modified', { ascending: false })
        .limit(20),
        
      // Get user profile
      supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single(),
        
      // Get stored memory
      supabaseAdmin
        .from('memory')
        .select('*')
        .eq('user_id', user.id)
    ]);
    
    console.log('Messages found:', messagesResponse.data?.length || 0);
    console.log('Files found:', filesResponse.data?.length || 0);
    console.log('Memory items found:', memoryResponse.data?.length || 0);
    
    // Prepare context object
    const context = {
      user: userResponse.data || { name: 'User' },
      recentMessages: messagesResponse.data || [],
      recentFiles: filesResponse.data || [],
      memory: memoryResponse.data || []
    };
    
    // Update memory access time
    if (memoryResponse.data && memoryResponse.data.length > 0) {
      const now = new Date().toISOString();
      memoryResponse.data.forEach(async (item) => {
        await supabaseAdmin
          .from('memory')
          .update({ last_accessed: now })
          .eq('id', item.id);
      });
    }
    
    return new Response(
      JSON.stringify(context),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in memory-context function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
