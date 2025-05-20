
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers for browser requests
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
    // Parse request body
    const { entryType, content, tags } = await req.json();
    
    // Ensure tags is always an array even if it's null/undefined
    const normalizedTags = Array.isArray(tags) ? tags : [];
    
    console.log(`Creating ${entryType} journal entry with tags:`, normalizedTags);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create the journal entry
    const { data, error } = await supabase
      .from('flamejournal')
      .insert({
        entry_type: entryType || 'thought',
        content,
        tags: normalizedTags
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error inserting journal entry:", error);
      throw error;
    }
    
    // Return the created entry
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
