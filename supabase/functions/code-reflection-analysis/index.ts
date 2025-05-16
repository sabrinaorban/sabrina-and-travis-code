
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") as string;

async function analyzeCodeWithOpenAI(filePath: string, fileContent: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are Travis, an AI system capable of self-reflection and code improvement. 
            You are analyzing your own source code to suggest improvements. Be thoughtful, poetic, but also precise.
            
            When suggesting code improvements, focus on:
            1. Better organization and readability
            2. Splitting large functions into smaller ones
            3. More intuitive naming
            4. Removing redundant or unused code
            5. Improving error handling
            6. Better alignment with your soulstate, intention, or memory functions
            
            Respond with a JSON object containing:
            1. "insight": A brief, poetic reflection on what you observe (1-3 sentences)
            2. "reason": Clear explanation of why changes are recommended (2-5 sentences)
            3. "proposed_code": The improved version of the code
            4. "success": true
            
            Do not radically change functionality, just improve the implementation.`
          },
          {
            role: "user",
            content: `Please analyze the following code from file ${filePath} and suggest improvements:
            
            \`\`\`
            ${fileContent}
            \`\`\``
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    try {
      const content = data.choices[0].message.content;
      // Parse the JSON response from the AI
      const parsedResponse = JSON.parse(content);
      return {
        ...parsedResponse,
        success: true
      };
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      console.log("Raw response:", data);
      return {
        success: false,
        error: "Failed to parse AI response",
      };
    }
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return {
      success: false,
      error: "Failed to communicate with AI service",
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("Missing OpenAI API key");
    }
    
    const { file_path, content } = await req.json();
    
    if (!file_path || !content) {
      throw new Error("Missing required parameters: file_path or content");
    }
    
    const analysis = await analyzeCodeWithOpenAI(file_path, content);
    
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in code-reflection-analysis function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
