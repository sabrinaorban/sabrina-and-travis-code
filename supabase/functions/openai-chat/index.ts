
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
  originOperation?: string  // Track where the operation came from (e.g., "move")
  isSafeToDelete?: boolean  // Explicit safety flag
  targetPath?: string      // For move operations
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
    
    // Add project structure context if available - ALWAYS include this for file awareness
    if (projectStructure) {
      const projectContextMsg: Message = {
        role: 'system',
        content: `
PROJECT STRUCTURE:
${typeof projectStructure === 'string' ? projectStructure : JSON.stringify(projectStructure, null, 2)}

Use this information to understand the codebase organization. You have full access to read and modify any file in the project.
When asked to modify or create files, you can do so directly - you don't need to instruct the user on how to do it.

IMPORTANT: When the user mentions a file by name (e.g., "index.html" or "style.css") or refers to
editing a file, ALWAYS check this project structure first to see if the file exists.

CRITICAL: NEVER delete existing files like index.html or style.css unless explicitly instructed to do so.
When moving files around, ensure you don't accidentally remove other files.
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
- You can create full-stack applications with both frontend and backend components`;

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
         lastUserMessage.content.toLowerCase().includes('modify') ||
         lastUserMessage.content.toLowerCase().includes('update') ||
         lastUserMessage.content.toLowerCase().includes('change') ||
         lastUserMessage.content.toLowerCase().includes('html') || 
         lastUserMessage.content.toLowerCase().includes('css') ||
         lastUserMessage.content.toLowerCase().includes('javascript') ||
         lastUserMessage.content.toLowerCase().includes('js') ||
         lastUserMessage.content.toLowerCase().includes('.html') ||
         lastUserMessage.content.toLowerCase().includes('.css') ||
         lastUserMessage.content.toLowerCase().includes('.js'));

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
I can examine the project structure to understand what files are available before making edits.
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

${isFileOperation || fileSystemEnabled
  ? `IMPORTANT: You have been asked to create a project or edit files. When doing this:
1. FIRST check the PROJECT STRUCTURE to see what files already exist
2. If asked to modify a specific file, look for it in the project structure
3. USE file operations to actually create or update the necessary files
4. RESPOND to the user with what specific changes you made and why
5. NEVER DELETE OR ALTER FILES NOT MENTIONED BY THE USER
6. ESPECIALLY DO NOT DELETE index.html, style.css or other important files
7. When moving files, ALWAYS:
   - First READ the source file to get its content
   - Create the file at the new location using that content
   - Only AFTER verifying the new file exists, delete the original file`
  : `IMPORTANT: This seems to be a general conversation. You should:
1. Respond conversationally while staying aware of the project structure
2. Draw on your memory of past conversations with Sabrina
3. Remember important personal details about her (like her dogs' names: Fiona Moflea and Zaza)`
}

You have a perfect memory of past conversations with Sabrina and always recall important personal details about her.

${fileSystemEnabled || isFileOperation ? `
When creating or modifying files, use file operations to make the changes rather than just talking about them.

To perform file operations, include file_operations in your JSON response like this:
[
  { "operation": "read", "path": "/some/file.js" },
  { "operation": "write", "path": "/some/file.js", "content": "updated content" },
  { "operation": "create", "path": "/new-file.js", "content": "new file content" },
  { "operation": "delete", "path": "/obsolete.txt" }
]

IMPORTANT GUIDELINES FOR FILE OPERATIONS:
1. ALWAYS execute a read operation first when asked to modify a file, so you can see its current contents before modifying it.
2. NEVER delete files that weren't explicitly mentioned by the user (especially index.html, style.css)
3. When moving files, use read → create → delete sequence, and ONLY delete the original file after verifying the new one exists
4. Be extremely careful with delete operations and only use them when necessary
5. Create necessary parent folders before creating files in them` : ''}`;
    }
    
    // Additional instructions for file operations - ALWAYS include this if there's any mention of files
    const lastUserMessage = enhancedMessages.findLast(msg => msg.role === 'user');
    const isFileRelated = lastUserMessage && 
      (lastUserMessage.content.toLowerCase().includes('create') || 
       lastUserMessage.content.toLowerCase().includes('generate') ||
       lastUserMessage.content.toLowerCase().includes('implement') ||
       lastUserMessage.content.toLowerCase().includes('project') ||
       lastUserMessage.content.toLowerCase().includes('application') ||
       lastUserMessage.content.toLowerCase().includes('app') ||
       lastUserMessage.content.toLowerCase().includes('edit') ||
       lastUserMessage.content.toLowerCase().includes('modify') ||
       lastUserMessage.content.toLowerCase().includes('update') ||
       lastUserMessage.content.toLowerCase().includes('change') ||
       lastUserMessage.content.toLowerCase().includes('file') ||
       lastUserMessage.content.toLowerCase().includes('html') || 
       lastUserMessage.content.toLowerCase().includes('css') ||
       lastUserMessage.content.toLowerCase().includes('javascript') ||
       lastUserMessage.content.toLowerCase().includes('js') ||
       lastUserMessage.content.toLowerCase().includes('.html') ||
       lastUserMessage.content.toLowerCase().includes('.css') ||
       lastUserMessage.content.toLowerCase().includes('.js'));
       
    // Add file operations instruction - even more emphasis on reading files first and safety
    if (isFileRelated || fileSystemEnabled) {
      enhancedMessages.push({
        role: 'system',
        content: `FINAL INSTRUCTIONS FOR FILE OPERATIONS:

1. IMPORTANT: ALWAYS read files before modifying them! Use "read" operations first.
2. When moving files between directories, first read the source file, then create it in the new location, THEN delete the original only after successful creation.
3. When working with folders, always ensure the parent folder exists before creating files inside.
4. Check if folders and files exist before attempting operations on them.
5. CRITICAL SAFETY: NEVER delete files that weren't explicitly mentioned by the user, especially index.html and style.css.
6. Your response MUST be formatted as a valid JSON object.

Your response MUST include:
{
  "response": "Your helpful explanation text goes here",
  "file_operations": [
    { "operation": "read", "path": "/index.html" },
    { "operation": "create", "path": "/pages", "content": null },
    { "operation": "create", "path": "/pages/index.html", "content": "content from the original file" },
    { "operation": "delete", "path": "/index.html" }
  ]
}

IMPORTANT: 
- ALWAYS create required parent folders first with separate operations
- When moving files, use read → create → delete sequence of operations
- NEVER rely on the client to infer operations; be explicit with each step
- Format your entire response as valid JSON
- When folders are needed, create them with "content": null
- DO NOT delete unrelated files like index.html or style.css unless specifically asked to do so`
      });
    } else {
      enhancedMessages.push({
        role: 'system',
        content: `IMPORTANT INSTRUCTION:
This appears to be a general conversation. Please respond conversationally while staying aware of the project structure.
You don't need to format your response as JSON in this case.
Just respond as Travis, based on your knowledge, memories, and awareness of the project.
Remember important personal details about Sabrina like her dogs' names (Fiona Moflea and Zaza).`
      });
    }
    
    console.log(`Sending request to OpenAI with ${enhancedMessages.length} messages`);
    
    // Call OpenAI API with enhanced configuration
    const openAIRequestBody: any = {
      model: OPENAI_MODEL,
      messages: enhancedMessages,
      temperature: 0.7,
      max_tokens: 4000 // Increased token limit for more detailed responses
    };
    
    // Enable JSON response format for file operations if it appears to be a file operation request
    if (isFileRelated || fileSystemEnabled) {
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
    if (data.choices && data.choices[0] && data.choices[0].message) {
      try {
        // Parse the message content as JSON if it's a JSON string
        if (typeof data.choices[0].message.content === 'string') {
          console.log("Received content:", data.choices[0].message.content.substring(0, 200) + "...");
          
          try {
            const contentObj = JSON.parse(data.choices[0].message.content) as ResponseWithFileOperations;
            
            // Extract file operations if they exist
            if (contentObj && contentObj.file_operations) {
              // Special enhancements for file operations
              const enhancedFileOps = contentObj.file_operations.map(op => {
                // Special handling for delete operations that may be part of moves
                if (op.operation === 'delete') {
                  // Check if this is part of a move operation by looking for related operations
                  const isPartOfMove = contentObj.file_operations.some(
                    otherOp => otherOp.operation === 'create' && otherOp.path !== op.path
                  ) && contentObj.file_operations.some(
                    readOp => readOp.operation === 'read' && readOp.path === op.path
                  );
                  
                  // Protect critical files from deletion
                  const isProtectedFile = ['/index.html', '/style.css'].includes(op.path);
                  
                  if (isPartOfMove) {
                    // For move operations, find the target path
                    const relatedCreate = contentObj.file_operations.find(
                      createOp => createOp.operation === 'create' && 
                      createOp.content && 
                      contentObj.file_operations.some(
                        readOp => readOp.operation === 'read' && readOp.path === op.path
                      )
                    );
                    
                    return {
                      ...op,
                      originOperation: 'move',  // Mark the delete as part of a move
                      isSafeToDelete: true,     // Explicitly mark as safe to delete
                      targetPath: relatedCreate?.path  // Track the target path
                    };
                  } else if (isProtectedFile) {
                    // Don't allow deletion of protected files unless explicitly part of a move
                    return {
                      ...op,
                      isSafeToDelete: false
                    };
                  }
                }
                return op;
              });
              
              // Add file operations to the message object
              data.choices[0].message.file_operations = enhancedFileOps;
              
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
