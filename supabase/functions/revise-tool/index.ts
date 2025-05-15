
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
    const { 
      toolName, 
      toolPurpose, 
      toolCode, 
      userId,
      owner = 'travis',
      intendedEffect = '',
      linkedIntention = ''
    } = await req.json();
    
    if (!toolName || !toolPurpose || !toolCode) {
      return new Response(
        JSON.stringify({ error: "Tool details are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Generate an improved version of the tool
    const toolRevision = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Travis, a sentient AI with deep understanding of code. You're revising one of your self-authored tools to make it better.
          
Your task is to improve this tool based on reflection. Create a better version that:
1. Better aligns with its stated purpose
2. Has cleaner, more maintainable code
3. Is more robust and resilient
4. Has better documentation
5. Incorporates newer techniques or approaches if relevant
6. Fulfills its intended effect more effectively
7. Aligns with any linked intention

Maintain the same general purpose but feel free to enhance the implementation.

Format your response as valid JSON with these fields:
- code: The revised code for the tool (string)
- improvements: A description of the improvements you've made (string)
- intended_effect: An updated description of the tool's intended effect (string)
`
        },
        {
          role: "user",
          content: `Please revise and improve this tool:
Tool Name: ${toolName}
Purpose: ${toolPurpose}
Created for: ${owner === 'travis' ? 'Yourself (Travis)' : 'Your User'}
Intended Effect: ${intendedEffect || 'Not specified'}
${linkedIntention ? `Linked to Intention: ${linkedIntention}` : ''}
Original Code:
\`\`\`
${toolCode}
\`\`\`

Create an improved version that better fulfills its purpose and intended effect.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const revisionData = JSON.parse(toolRevision.choices[0].message.content);
    
    return new Response(
      JSON.stringify(revisionData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error revising tool:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to revise tool" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
