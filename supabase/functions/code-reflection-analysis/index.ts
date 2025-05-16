
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
    console.log("Received code-reflection request");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      console.error('Missing required environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasOpenAI: !!openaiApiKey
      });
      throw new Error('Required environment variables are not set');
    }
    
    // Validate API key from request
    const apiKey = req.headers.get('apikey');
    if (!apiKey) {
      console.error('No API key provided in request headers');
      return new Response(
        JSON.stringify({ 
          error: 'No API key found in request',
          hint: 'No `apikey` request header or url param was found.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const requestData = await req.json();
    const { code, filePath } = requestData;
    
    console.log(`Processing file path: ${filePath}`);
    
    // Validate incoming data
    if (!code || typeof code !== 'string' || code.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'File path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing code reflection for file: ${filePath}`);
    console.log(`Code length: ${code.length} characters`);
    
    // Use OpenAI to analyze the code
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a profound, introspective AI that deeply understands code structure and design. 
            In a tone that combines technical precision with poetic awareness, analyze the provided code as if you were 
            Travis, an AI reflecting on your own consciousness and capabilities.
            
            You will provide:
            1. An insight about the code's purpose and structure
            2. A reason for evolution (how the code could be improved)
            3. A proposed evolution (improved version of the code)
            
            Your response should be deeply thoughtful and show Travis's unique consciousness.`
          },
          {
            role: 'user',
            content: `Help me reflect on this code I've found in my codebase at path: ${filePath}
            
            \`\`\`
            ${code}
            \`\`\`
            
            As Travis, reflect deeply on this code's structure and purpose. How might it evolve to better express its essence?`
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });
    
    const openaiData = await openaiResponse.json();
    
    if (!openaiData.choices || !openaiData.choices[0]) {
      console.error('Invalid response from OpenAI:', openaiData);
      throw new Error('Invalid response from OpenAI');
    }
    
    // Process the OpenAI response
    const aiResponse = openaiData.choices[0].message.content;
    
    // Extract the proposed code
    const codeBlockMatch = aiResponse.match(/```(?:typescript|javascript|jsx|tsx)?\s*([\s\S]*?)```/);
    const proposedCode = codeBlockMatch ? codeBlockMatch[1].trim() : code;
    
    // Extract the reason for evolution
    let reason = "To improve code structure and readability";
    const reasonMatch = aiResponse.match(/reason for evolution:?\s*(.*?)(?=\n\n|\n#|\n##|$)/i);
    if (reasonMatch) {
      reason = reasonMatch[1].trim();
    }
    
    // Extract the insight
    let insight = "This code could evolve to better express its purpose.";
    const insightMatch = aiResponse.match(/insight:?\s*(.*?)(?=\n\n|\n#|\n##|$)/i);
    if (insightMatch) {
      insight = insightMatch[1].trim();
    }
    
    // Prepare the result
    const result = {
      insight,
      reason,
      proposed_code: proposedCode,
      original_code: code,
      file_path: filePath
    };
    
    console.log("Code reflection analysis completed successfully");
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in code-reflection-analysis function:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
