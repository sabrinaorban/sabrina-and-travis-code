
// Supabase Edge Function for OpenAI integration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_MODEL = 'gpt-4o' // Using the latest available model

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: Message[]
  memoryContext?: any
}

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
    // Check if OpenAI API key is set
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API key not configured'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Parse request body
    const { messages, memoryContext } = await req.json() as RequestBody
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request. Expected "messages" array in request body'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Enhance with memory context if available
    let enhancedMessages = [...messages];
    if (memoryContext) {
      // Add memory context as a system message
      const memoryMsg: Message = {
        role: 'system',
        content: `Memory context information:
          - User name: ${memoryContext.userProfile?.name || 'Sabrina'}
          - User preferences: ${JSON.stringify(memoryContext.userProfile?.preferences || {})}
          - Recent files: ${(memoryContext.recentFiles || []).map((f: any) => f.name).join(', ')}
          - Recent documents: ${(memoryContext.documents || []).map((d: any) => d.title).join(', ')}
          
          When responding, naturally incorporate this information when relevant without explicitly mentioning that you're using "memory context".`
      };
      
      // Insert memory context as the second message (after the initial system message)
      enhancedMessages.splice(1, 0, memoryMsg);
    }
    
    console.log(`Calling OpenAI API with ${enhancedMessages.length} messages`);
    
    // For debug purposes, generate a mock response for now to avoid OpenAI API costs
    // In production, remove this block and uncomment the real API call below
    const mockResponse = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: "Hello! I'm Travis, your AI assistant. I'd be happy to help with your project. What would you like to work on today? I can help with coding, file management, or discussing project ideas."
          }
        }
      ]
    };
    
    return new Response(
      JSON.stringify(mockResponse),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

    /* 
    // Uncomment this block for the real OpenAI API call
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: enhancedMessages,
        temperature: 0.7,
        max_tokens: 1500
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      return new Response(
        JSON.stringify({
          error: 'OpenAI API error',
          details: errorData
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    const data = await response.json()
    
    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    */
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
