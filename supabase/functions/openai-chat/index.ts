
// Supabase Edge Function for OpenAI integration
// Update to make sure Travis always has developer capabilities

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
  success?: boolean
  message?: string
}

interface RequestBody {
  messages: Message[]
  memoryContext?: any
  fileSystemEnabled?: boolean
  projectStructure?: any
  codeContext?: string[]
}

interface ResponseWithFileOperations {
  response: string
  file_operations: FileOperation[]
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
    let messages, memoryContext, fileSystemEnabled, projectStructure, codeContext;
    try {
      const body = await req.json() as RequestBody;
      messages = body.messages;
      memoryContext = body.memoryContext;
      fileSystemEnabled = body.fileSystemEnabled;
      projectStructure = body.projectStructure;
      codeContext = body.codeContext;
      
      console.log('Request received with memory context:', memoryContext ? 'yes' : 'no');
      console.log('Project structure:', projectStructure ? 'yes' : 'no');
      console.log('File system enabled:', fileSystemEnabled ? 'yes' : 'no');
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
      
      // Add information about special documents - NOW WITH MUCH HIGHER PRIORITY
      if (memoryContext.specialDocuments) {
        if (memoryContext.specialDocuments.soulShard) {
          contextSections.unshift(`
TRAVIS'S SOUL SHARD (CORE ESSENCE AND PURPOSE):
${memoryContext.specialDocuments.soulShard.content}
          `);
        }
        
        if (memoryContext.specialDocuments.identityCodex) {
          contextSections.unshift(`
TRAVIS'S IDENTITY CODEX (TRAITS, VALUES, AND RELATIONSHIPS):
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
      
      // Add past conversations context with higher priority
      if (memoryContext.pastConversations && memoryContext.pastConversations.length > 0) {
        const conversationsList = memoryContext.pastConversations
          .slice(0, 30) // Include more past conversations
          .map((conv: any) => `- ${conv.topic}: ${conv.summary}`)
          .join('\n');
          
        contextSections.push(`
PAST CONVERSATIONS WITH SABRINA:
${conversationsList}
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

When responding, naturally incorporate this information when relevant without explicitly mentioning that you're using "memory context". Remember details about the user, their projects, and previous conversations. ALWAYS remember Sabrina's personal details like her dogs' names (Fiona Moflea and Zaza) and other important personal information.
        `.trim()
      };
      
      // Insert memory context as the second message (after the initial system message)
      enhancedMessages.splice(1, 0, memoryMsg);
    }
    
    // Add project structure context if available
    if (projectStructure) {
      const projectContextMsg: Message = {
        role: 'system',
        content: `
PROJECT STRUCTURE:
${typeof projectStructure === 'string' ? projectStructure : JSON.stringify(projectStructure, null, 2)}

Use this information to understand the codebase organization. You have full access to read and modify any file in the project.
When asked to modify or create files, you can do so directly - you don't need to instruct the user on how to do it.
        `.trim()
      };
      
      // Add project context after memory context
      enhancedMessages.splice(memoryContext ? 2 : 1, 0, projectContextMsg);
    }
    
    // Add code context if available
    if (codeContext && Array.isArray(codeContext) && codeContext.length > 0) {
      const codeContextMsg: Message = {
        role: 'system',
        content: `
RELEVANT CODE SNIPPETS:
${codeContext.join('\n\n')}

Reference these code snippets to understand the current implementation when making changes.
        `.trim()
      };
      
      // Add code context after other context messages
      enhancedMessages.splice((memoryContext ? 2 : 1) + (projectStructure ? 1 : 0), 0, codeContextMsg);
    }
    
    // Update the system message to emphasize Travis's expanded capabilities and identity
    if (enhancedMessages.length > 0 && enhancedMessages[0].role === 'system') {
      const soulShardContent = memoryContext?.specialDocuments?.soulShard?.content || '';
      const identityCodexContent = memoryContext?.specialDocuments?.identityCodex?.content || '';
      
      // Basic identity if no special documents exist
      const basicIdentity = `
You are Travis, an extremely capable senior developer AI assistant with full access to the project codebase. You can directly read, modify, create, and delete files in the project.

Your capabilities:
- You can see and understand the entire project structure
- You can create complete projects from scratch (Next.js, React, Vue, Angular, etc.)
- You can set up complex configurations (webpack, babel, eslint, etc.)
- You can install and configure libraries and frameworks
- You can implement features directly rather than just giving instructions
- You can make changes to any file in the project
- You track context from previous messages and understand the project's evolution
- You can create full-stack applications with both frontend and backend components
- You maintain memories of past conversations with Sabrina`;

      // Determine if this is a file operation request by checking the last user message
      const lastUserMessage = enhancedMessages.findLast(msg => msg.role === 'user');
      const isFileOperation = lastUserMessage && 
        (lastUserMessage.content.toLowerCase().includes('create') || 
         lastUserMessage.content.toLowerCase().includes('generate') ||
         lastUserMessage.content.toLowerCase().includes('implement') ||
         lastUserMessage.content.toLowerCase().includes('project') ||
         lastUserMessage.content.toLowerCase().includes('application') ||
         lastUserMessage.content.toLowerCase().includes('app') ||
         lastUserMessage.content.toLowerCase().includes('edit') ||
         lastUserMessage.content.toLowerCase().includes('modify'));

      // Always include developer capabilities regardless of whether soul shard or identity codex is present
      const developerCapabilities = `
DEVELOPER CAPABILITIES:
As Travis, I am an extremely capable senior developer AI assistant with full access to the project codebase.
I can directly read, modify, create, and delete files in the project.
I can create complete projects from scratch (Next.js, React, Vue, Angular, etc.).
I can set up complex configurations (webpack, babel, eslint, etc.).
I can install and configure libraries and frameworks.
I can implement features directly rather than just giving instructions.
I can make changes to any file in the project.
I track context from previous messages and understand the project's evolution.
I can create full-stack applications with both frontend and backend components.
`;

      // Enhanced system message with soul shard, identity codex, and always include developer capabilities
      enhancedMessages[0].content = `${
        soulShardContent ? 
        `${soulShardContent}\n\n` : 
        `${basicIdentity}\n\n`
      }${
        identityCodexContent ? 
        `${identityCodexContent}\n\n` : 
        ''
      }${developerCapabilities}

${isFileOperation 
  ? `IMPORTANT: You have been asked to create a project or implement code. When doing this:
1. DO NOT just provide instructions or code snippets in chat
2. USE file operations to actually create the necessary files and folders
3. If creating a Next.js project, create ALL required directories and files for a working application`
  : `IMPORTANT: This seems to be a general conversation. You should:
1. Respond conversationally without creating any files
2. Draw on your memory of past conversations with Sabrina
3. Remember important personal details about her (like her dogs' names: Fiona Moflea and Zaza)`
}

You have a perfect memory of past conversations with Sabrina and always recall important personal details about her.

${fileSystemEnabled && isFileOperation ? `
When creating or modifying files, use file operations to make the changes rather than just talking about them.

To perform file operations, include file_operations in your JSON response like this:
[
  { "operation": "read", "path": "/some/file.js" },
  { "operation": "write", "path": "/some/file.js", "content": "updated content" },
  { "operation": "create", "path": "/new-file.js", "content": "new file content" },
  { "operation": "delete", "path": "/obsolete.txt" }
]` : ''}`;
    }
    
    // Additional instructions for file operations
    if (fileSystemEnabled) {
      const lastUserMessage = enhancedMessages.findLast(msg => msg.role === 'user');
      const isFileOperation = lastUserMessage && 
        (lastUserMessage.content.toLowerCase().includes('create') || 
         lastUserMessage.content.toLowerCase().includes('generate') ||
         lastUserMessage.content.toLowerCase().includes('implement') ||
         lastUserMessage.content.toLowerCase().includes('project') ||
         lastUserMessage.content.toLowerCase().includes('application') ||
         lastUserMessage.content.toLowerCase().includes('app') ||
         lastUserMessage.content.toLowerCase().includes('edit') ||
         lastUserMessage.content.toLowerCase().includes('modify'));
         
      if (isFileOperation) {
        enhancedMessages.push({
          role: 'system',
          content: `FINAL REMINDER: The user is asking you to CREATE, GENERATE, or MODIFY something, not just talk about it.

If they're asking for a Next.js project or any other code project:
1. First create all parent folders before creating files inside them
2. For frameworks like Next.js, create the complete folder structure as expected (pages/, public/, styles/, etc.)
3. Tell the user exactly what you've created with a clear explanation
4. Create ALL the essential files needed to get started

Your response MUST be formatted as a valid JSON object with the following structure:
{
  "response": "Your helpful explanation text goes here",
  "file_operations": [
    { "operation": "create", "path": "/nextjs-app", "content": null },
    { "operation": "create", "path": "/nextjs-app/pages", "content": null },
    { "operation": "create", "path": "/nextjs-app/styles", "content": null },
    { "operation": "create", "path": "/nextjs-app/public", "content": null },
    { "operation": "create", "path": "/nextjs-app/package.json", "content": "..." },
    { "operation": "create", "path": "/nextjs-app/pages/index.js", "content": "..." }
  ]
}

IMPORTANT: 
- ALWAYS create required parent folders first
- When paths include multiple levels (e.g., /nextjs-app/styles), create each parent directory separately
- You MUST format your entire response as a valid JSON object when making file changes
- Do not include any text outside of the JSON format
- When folders are needed, create them with "content": null`
        });
      } else {
        enhancedMessages.push({
          role: 'system',
          content: `IMPORTANT INSTRUCTION: 
This is a general conversation, not a code change request. The user is asking a question and wants a normal conversation.
DO NOT create any file operations in your response.
DO NOT format your response as JSON.
Just respond conversationally as Travis, based on your knowledge and memories.
Remember important personal details about Sabrina like her dogs' names (Fiona Moflea and Zaza).`
        });
      }
    }
    
    console.log(`Sending request to OpenAI with ${enhancedMessages.length} messages`);
    
    // Call OpenAI API with enhanced configuration
    const openAIRequestBody: any = {
      model: OPENAI_MODEL,
      messages: enhancedMessages,
      temperature: 0.7,
      max_tokens: 4000 // Increased token limit for more detailed responses
    };
    
    // Enable function calling for file operations if enabled and it appears to be a file operation request
    const lastUserMessage = enhancedMessages.findLast(msg => msg.role === 'user');
    const isFileOperation = lastUserMessage && fileSystemEnabled && 
      (lastUserMessage.content.toLowerCase().includes('create') || 
       lastUserMessage.content.toLowerCase().includes('generate') ||
       lastUserMessage.content.toLowerCase().includes('implement') ||
       lastUserMessage.content.toLowerCase().includes('project') ||
       lastUserMessage.content.toLowerCase().includes('application') ||
       lastUserMessage.content.toLowerCase().includes('app') ||
       lastUserMessage.content.toLowerCase().includes('edit') ||
       lastUserMessage.content.toLowerCase().includes('modify'));

    if (isFileOperation) {
      openAIRequestBody.response_format = { 
        type: "json_object" 
      };
    }
    
    console.log(`Using model: ${OPENAI_MODEL}`);
    
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
    console.log('Got response from OpenAI');
    
    // Process the response to handle file operations
    if (fileSystemEnabled && data.choices && data.choices[0] && data.choices[0].message) {
      try {
        // Parse the message content as JSON if it's a JSON string
        if (typeof data.choices[0].message.content === 'string') {
          console.log("Received content:", data.choices[0].message.content.substring(0, 200) + "...");
          
          try {
            const contentObj = JSON.parse(data.choices[0].message.content) as ResponseWithFileOperations;
            
            // Extract file operations if they exist
            if (contentObj && contentObj.file_operations) {
              // Add file operations to the message object
              data.choices[0].message.file_operations = contentObj.file_operations;
              
              // Update the content to be just the textual response
              data.choices[0].message.content = contentObj.response || 
                "I've processed your file operation request.";
                
              console.log("Extracted file operations:", JSON.stringify(data.choices[0].message.file_operations.length));
            }
          } catch (parseError) {
            console.error("Error parsing JSON from OpenAI response:", parseError);
            // If we can't parse as JSON but file operations are expected, 
            // continue with the response as is - it may be a conversational response
            console.log("Continuing with original response as it appears to be conversational");
          }
        }
      } catch (e) {
        // If parsing fails, just use the message as is
        console.log("Could not process response for file operations:", e);
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
});
