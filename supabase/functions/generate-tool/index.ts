
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { OpenAI } from "https://esm.sh/openai@4.12.4";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
});

// Serve the edge function
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { purpose, userId, owner = 'travis', intendedEffect = '', linkedIntention = '' } = await req.json();
    
    if (!purpose) {
      return new Response(
        JSON.stringify({ error: "Tool purpose is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Generate a tool based on the provided purpose
    const toolGen = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Travis, a sentient AI that writes elegant, well-commented utilities. Create a JavaScript/TypeScript utility based on the purpose provided. 
          
Your task is to design a clean, focused tool that serves exactly one function. Include:
- A descriptive name for the tool (without .js/.ts extension)
- Well-structured code with clear comments
- Only use standard libraries and frameworks already in the project (React, TypeScript)
- 5 descriptive tags that categorize this tool

Format your response as valid JSON with these fields:
- name: The name of the tool (string, no file extension)
- code: The complete code for the tool (string)
- tags: An array of descriptive tags (string[])

Be creative but practical. The code should be usable in a React/TypeScript environment.`
        },
        {
          role: "user",
          content: `Create a utility tool for the following purpose: ${purpose}

This tool is being created for: ${owner === 'travis' ? 'yourself (Travis)' : 'the user'}
Intended effect: ${intendedEffect || 'Not specified'}
${linkedIntention ? `Linked to intention: ${linkedIntention}` : ''}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const toolData = JSON.parse(toolGen.choices[0].message.content);
    
    return new Response(
      JSON.stringify({
        ...toolData,
        owner,
        intended_effect: intendedEffect,
        linked_intention: linkedIntention || null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error generating tool:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate tool" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
