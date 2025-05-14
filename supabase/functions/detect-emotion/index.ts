
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('Missing OpenAI API key');
    }

    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    // Call OpenAI API to analyze emotion
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `Analyze the emotional tone of the following message. Respond ONLY with a single word from this list: joy, sadness, anger, fear, surprise, disgust, trust, anticipation, curiosity, frustration, wonder, calm, neutral. Choose the most dominant emotion present.` 
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 10
      })
    });

    const data = await openaiResponse.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI');
    }

    // Extract the emotion from the response
    const content = data.choices[0].message.content;
    const emotion = content.toLowerCase().trim()
      .replace(/[.!,;]$/g, '') // Remove punctuation
      .replace(/^the emotion is /i, '') // Remove prefixes
      .replace(/^emotion: /i, '');

    return new Response(
      JSON.stringify({ emotion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in detect-emotion function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message, emotion: 'neutral' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
