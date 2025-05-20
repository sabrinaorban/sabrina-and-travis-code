
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Set up Supabase client with the service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_MODEL = 'gpt-4o';
const DEBUG_ENABLED = true;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, memoryContext, fileSystemEnabled, projectStructure } = await req.json();

    // Log request details to help with debugging
    if (DEBUG_ENABLED) {
      console.log('Request received with memory context:', memoryContext ? 'yes' : 'no');
      console.log('Project structure:', projectStructure ? 'yes' : 'no');
      console.log('File system enabled:', fileSystemEnabled ? 'yes' : 'no');
      console.log('Request metadata:', memoryContext || {});
    }

    // Safety check for the openai key
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        error: 'OpenAI API key not found'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine which model to use
    const model = DEFAULT_MODEL;
    if (DEBUG_ENABLED) {
      console.log('Using model:', model);
    }
    
    // Prepare the request body for OpenAI
    // Important: REMOVE response_format since it requires 'json' in messages
    // We'll handle the output formatting elsewhere if needed
    const requestBody = {
      model: model,
      messages: messages,
      max_tokens: 2048,
      temperature: 0.7,
    };

    // Log sent messages for debugging
    if (DEBUG_ENABLED) {
      console.log('Sending request to OpenAI with', messages.length, 'messages');
    }

    // Make the API call to OpenAI
    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await openAIResponse.json();
      
      // Check for OpenAI errors
      if (data.error) {
        console.error('OpenAI API error:', JSON.stringify(data));
        throw new Error(`OpenAI API error: ${data.error.message}`);
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (openaiError) {
      console.error('Error calling OpenAI API:', openaiError);
      throw openaiError;
    }
    
  } catch (error) {
    console.error('Error in openai-chat function:', error);
    
    return new Response(
      JSON.stringify({ error: `OpenAI API call failed`, message: error.message, retryable: false }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
