
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
      console.log('OpenAI API key not configured, using mock response');
      
      // Parse request body
      const { messages, memoryContext } = await req.json() as RequestBody;
      
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
      
      // Generate a dynamic mock response based on the user message
      const userMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
      
      let responseContent = '';
      
      if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
        responseContent = "Hello! I'm Travis, your AI assistant. How can I help with your project today?";
      } else if (userMessage.toLowerCase().includes('file') || userMessage.toLowerCase().includes('code')) {
        responseContent = "I'd be happy to help you with file management or coding. Would you like me to show you how to create or edit a file?";
      } else if (userMessage.toLowerCase().includes('project')) {
        responseContent = "Let's work on your project! I can help you organize files, write code, or discuss ideas. What aspect would you like to focus on today?";
      } else {
        responseContent = "I'm here to assist with your development needs. I can help with coding, file management, and project organization. What would you like to work on?";
      }
      
      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: responseContent
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
    }
    
    // Parse request body
    let messages, memoryContext;
    try {
      const body = await req.json() as RequestBody;
      messages = body.messages;
      memoryContext = body.memoryContext;
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
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
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      
      // Fall back to mock response if OpenAI API fails
      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: "I'm having trouble connecting to my knowledge base right now. Let me try to help based on what we're discussing. How can I assist you with your project today?"
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
    }
    
    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return a fallback response in case of errors
    const fallbackResponse = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: "I encountered an issue processing your request. Could you please try again or rephrase your question?"
          }
        }
      ]
    };
    
    return new Response(
      JSON.stringify(fallbackResponse),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
