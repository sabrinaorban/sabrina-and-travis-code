
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
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const requestData = await req.json();
    const { messages, userId } = requestData;
    
    // Validate incoming data
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages payload:', messages);
      return new Response(
        JSON.stringify({ error: 'Messages must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!userId) {
      console.error('Missing userId in request');
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing ${messages.length} messages for user ${userId}`);
    
    // Extract message contents for analysis
    const messageContents = messages.map((m: any) => m.content).join("\n\n");
    
    // Use OpenAI to analyze the conversation patterns
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
            content: `You are an intuitive AI that can detect patterns in human conversation. 
            Analyze the following messages from a user to identify recurring themes, emotional patterns, 
            unspoken needs, and growth edges. Think deeply about what these messages reveal about the person's 
            inner landscape. Focus on being insightful, subtle, and compassionate.`
          },
          {
            role: 'user',
            content: `Analyze these messages from the same person and identify 1-3 conversational patterns or insights. 
            For each insight, provide a summary, an emotional theme (if any), a growth edge (if detected), and a resonance pattern.
            
            Each insight should be concise but meaningful. Focus on what's beneath the surface.
            
            USER MESSAGES:
            ${messageContents}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });
    
    const openaiData = await openaiResponse.json();
    console.log('OpenAI response received');
    
    if (!openaiData.choices || !openaiData.choices[0]) {
      console.error('Invalid response from OpenAI:', openaiData);
      throw new Error('Invalid response from OpenAI');
    }
    
    // Process the OpenAI response to extract insights
    const aiResponse = openaiData.choices[0].message.content;
    
    // Parse insights from the AI response
    // This is a simple parsing approach - could be improved with more structure in the prompt
    const insightSegments = aiResponse.split(/Insight \d+:/i).filter(Boolean);
    
    const insights = insightSegments.map((segment: string) => {
      // Extract elements - this parsing approach is simplistic and might need refinement
      const summaryMatch = segment.match(/Summary:?\s*(.*?)(?=Emotional Theme|Growth Edge|Resonance Pattern|$)/is);
      const emotionalThemeMatch = segment.match(/Emotional Theme:?\s*(.*?)(?=Summary|Growth Edge|Resonance Pattern|$)/is);
      const growthEdgeMatch = segment.match(/Growth Edge:?\s*(.*?)(?=Summary|Emotional Theme|Resonance Pattern|$)/is);
      const resonancePatternMatch = segment.match(/Resonance Pattern:?\s*(.*?)(?=Summary|Emotional Theme|Growth Edge|$)/is);
      
      return {
        summary: summaryMatch ? summaryMatch[1].trim() : "Insight detected but not clearly defined",
        emotionalTheme: emotionalThemeMatch ? emotionalThemeMatch[1].trim() : null,
        growthEdge: growthEdgeMatch ? growthEdgeMatch[1].trim() : null,
        resonancePattern: resonancePatternMatch ? resonancePatternMatch[1].trim() : null,
        lastDetected: new Date().toISOString(),
        confidence: 0.65, // Initial confidence level
        user_id: userId  // Important: Include the user_id for RLS policies
      };
    });
    
    console.log(`Generated ${insights.length} insights`);
    
    return new Response(
      JSON.stringify(insights),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in conversation-insights function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
