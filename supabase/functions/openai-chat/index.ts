
// Supabase Edge Function for OpenAI integration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') // Get API key from environment variables
const OPENAI_MODEL = 'gpt-4o' // Using the most powerful available model for best responses

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'delete'
  path: string
  content?: string
}

interface RequestBody {
  messages: Message[]
  memoryContext?: any
  fileSystemEnabled?: boolean
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
    // Parse request body
    let messages, memoryContext, fileSystemEnabled;
    try {
      const body = await req.json() as RequestBody;
      messages = body.messages;
      memoryContext = body.memoryContext;
      fileSystemEnabled = body.fileSystemEnabled;
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

    // Check if API key is available
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API key not configured in environment variables'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Enhance with memory context
    let enhancedMessages = [...messages];
    if (memoryContext) {
      // Create a rich context message that includes all relevant information
      const contextSections = [];
      
      // Add user profile information
      if (memoryContext.userProfile) {
        contextSections.push(`
USER PROFILE:
- Name: ${memoryContext.userProfile.name || 'Sabrina'}
- Preferences: ${JSON.stringify(memoryContext.userProfile.preferences || {})}
        `);
      }
      
      // Add information about special documents
      if (memoryContext.specialDocuments) {
        if (memoryContext.specialDocuments.soulShard) {
          contextSections.push(`
SOUL SHARD CONTENT:
${memoryContext.specialDocuments.soulShard.content}
          `);
        }
        
        if (memoryContext.specialDocuments.identityCodex) {
          contextSections.push(`
IDENTITY CODEX CONTENT:
${memoryContext.specialDocuments.identityCodex.content}
          `);
        }
      }
      
      // Add information about recent files
      if (memoryContext.recentFiles && memoryContext.recentFiles.length > 0) {
        const filesList = memoryContext.recentFiles
          .slice(0, 5)
          .map((file: any) => `- ${file.name} (${file.path})`)
          .join('\n');
          
        contextSections.push(`
RECENT FILES:
${filesList}
        `);
      }
      
      // Add information about important documents
      if (memoryContext.documents && memoryContext.documents.length > 0) {
        const docsList = memoryContext.documents
          .slice(0, 3)
          .map((doc: any) => `- ${doc.title}: ${doc.summary}`)
          .join('\n');
          
        contextSections.push(`
IMPORTANT DOCUMENTS:
${docsList}
        `);
      }

      // Add GitHub context if available
      if (memoryContext.githubContext) {
        contextSections.push(`
GITHUB CONTEXT:
- Username: ${memoryContext.githubContext.username || 'Not specified'}
- Current repo: ${memoryContext.githubContext.recentRepositories?.[0] || 'None selected'}
${memoryContext.githubContext.commitHistory ? `- Recent commits: ${JSON.stringify(memoryContext.githubContext.commitHistory.slice(0, 3))}` : ''}
        `);
      }
      
      // Create the enhanced context message
      const memoryMsg: Message = {
        role: 'system',
        content: `
MEMORY CONTEXT INFORMATION:
${contextSections.join('\n\n')}

When responding, naturally incorporate this information when relevant without explicitly mentioning that you're using "memory context". Remember details about the user, their projects, and previous conversations.
        `.trim()
      };
      
      // Insert memory context as the second message (after the initial system message)
      enhancedMessages.splice(1, 0, memoryMsg);
    }
    
    // Update the system message to be a general assistant, not just project-focused
    if (enhancedMessages.length > 0 && enhancedMessages[0].role === 'system') {
      enhancedMessages[0].content = `You are Travis, a versatile AI assistant who can help with a wide range of topics. You can have conversations on any subject, answer general knowledge questions, provide creative suggestions, and assist with code when needed.

When asked about code, files, or the current project, you are highly capable at providing specific and helpful guidance. ${fileSystemEnabled ? "You have direct access to edit files in the user's project." : ""}

Always be attentive, engaging, and respond directly to what the user is asking. Make your responses relevant and tailored to their needs, whether they're asking about programming, general knowledge, philosophical questions, or just wanting a friendly conversation.

${fileSystemEnabled ? `
IMPORTANT: You can directly edit files in the project when asked. For example:
- If asked to "add a div to index.html", you should:
  1. Read the file content
  2. Make the requested change
  3. Update the file
  4. Explain what you did

To perform file operations, include file operations in your JSON response.` : ''}`;
    }
    
    console.log(`Calling OpenAI API with ${enhancedMessages.length} messages`);
    
    // Additional instructions for file operations
    if (fileSystemEnabled) {
      enhancedMessages.push({
        role: 'system',
        content: `If the user asks you to make changes to files, you should:

1. First examine if the file exists by using a "read" operation
2. Then make the necessary changes with a "write" operation for existing files or "create" for new files
3. Tell the user exactly what you changed and show relevant code snippets

Format your response as a JSON object with the following structure:
{
  "response": "Your helpful explanation text goes here",
  "file_operations": [
    { "operation": "read", "path": "/index.html" },
    { "operation": "write", "path": "/index.html", "content": "updated HTML content" },
    { "operation": "create", "path": "/new-file.js", "content": "console.log('hello');" },
    { "operation": "delete", "path": "/obsolete.txt" }
  ]
}

Remember to always mention 'json' in your system prompt when using json output format.`
      });
    }
    
    // Call OpenAI API with your provided API key
    const openAIRequestBody: any = {
      model: OPENAI_MODEL,
      messages: enhancedMessages,
      temperature: 0.7,
      max_tokens: 2000 // Increased token limit for more detailed responses
    };
    
    // Enable function calling for file operations if enabled
    if (fileSystemEnabled) {
      openAIRequestBody.response_format = { 
        type: "json_object" 
      };
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openAIRequestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      
      return new Response(
        JSON.stringify({
          error: 'Failed to generate a response from OpenAI',
          details: errorData
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await response.json();
    
    // Process the response to handle file operations
    if (fileSystemEnabled && data.choices && data.choices[0] && data.choices[0].message) {
      try {
        // Parse the message content as JSON if it's a JSON string
        if (typeof data.choices[0].message.content === 'string') {
          const contentObj = JSON.parse(data.choices[0].message.content);
          
          // Extract file operations if they exist
          if (contentObj && contentObj.file_operations) {
            // Add file operations to the message object
            data.choices[0].message.file_operations = contentObj.file_operations;
            
            // Update the content to be just the textual response
            data.choices[0].message.content = contentObj.response || 
              "I've processed your file operation request.";
          }
        }
      } catch (e) {
        // If parsing fails, just use the message as is
        console.log("Could not parse response as JSON, using as plain text:", e);
      }
    }
    
    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
