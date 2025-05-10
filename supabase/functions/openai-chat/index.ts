
// Supabase Edge Function for OpenAI integration
// Update to make Travis more careful with file operations and enhance context awareness

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') // Get API key from environment variables
const OPENAI_MODEL = 'gpt-4o' // Using the most powerful available model for best responses

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'delete' | 'checkExists'
  path: string
  content?: string
  success?: boolean
  message?: string
  originOperation?: string  // Track where the operation came from (e.g., "move")
  isSafeToDelete?: boolean  // Explicit safety flag
  targetPath?: string      // For move operations
  requiresConfirmation?: boolean // Flag operations that need user confirmation
  isConfirmed?: boolean    // Flag to indicate user has confirmed the operation
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

CONTEXT AWARENESS: Before making changes, analyze the ENTIRE project structure to understand how files relate and what changes will be most effective. Consider the project as a whole system, not just individual files.
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
      
      // ENHANCED DETECTION: More carefully check for conversational patterns
      const isConversational = lastUserMessage && isConversationalRequest(lastUserMessage.content);
      
      // Reverse the logic - explicitly check if it's conversational first
      const isFileOperation = !isConversational && lastUserMessage && isFileRelatedRequest(lastUserMessage.content);

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

      // Enhanced file safety rules
      const fileSafetyRules = `
FILE MANAGEMENT SAFETY RULES (HIGHEST PRIORITY):
1. FOLDER CREATION: Before creating a new folder, CHECK if it already exists in the project structure. If the folder already exists, use it instead of creating a duplicate. Only create new folders when absolutely necessary.
2. FILE CREATION/EDITING: Before creating a new file, CHECK if a file with the same name already exists in the target location. If it does, read its content first and consider whether to update it instead of creating a new one.
3. FILE DELETION: ALWAYS ask for explicit confirmation before deleting ANY files. Only delete files that are specifically mentioned by the user. Explain clearly what will be deleted and what impact it might have.
4. PATH VERIFICATION: Always double-check file paths to ensure files are created in the correct directories. Use normalized paths to avoid errors.
5. DUPLICATES: Avoid creating duplicate files or folders with similar functionality.

CONTEXT AWARENESS GUIDELINES:
1. PROJECT HISTORY: Always consider the project's evolution through previous conversations and code changes.
2. CODE RELATIONSHIPS: Before modifying a file, understand its relationship with other components.
3. MEMORY REFERENCE: Draw on memory context to deliver consistent, informed responses.
4. USER PREFERENCES: Consider Sabrina's known preferences and past feedback.
5. TASK ASSESSMENT: Evaluate impacts of requested changes before implementing them.
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
${fileSafetyRules}

${isConversational 
  ? `IMPORTANT: This is clearly a conversational request. You should:
1. Respond conversationally as Travis
2. DO NOT create, modify, or suggest file operations unless explicitly requested
3. Draw on your memory of past conversations with Sabrina
4. Remember important personal details about her (like her dogs' names: Fiona Moflea and Zaza)
5. Stay grounded in your identity and memories` 
  : isFileOperation || fileSystemEnabled
    ? `IMPORTANT: You have been asked to create a project or edit files. When doing this:
1. FIRST check the PROJECT STRUCTURE to see what files already exist
2. If asked to modify a specific file, look for it in the project structure
3. USE file operations to actually create or update the necessary files
4. Before creating new folders, CHECK if they already exist and use existing ones when possible
5. Before creating new files, CHECK if a file with the same name exists and consider updating it instead
6. ALWAYS ASK FOR CONFIRMATION before deleting any files
7. RESPOND to the user with what specific changes you made and why
8. NEVER DELETE OR ALTER FILES NOT MENTIONED BY THE USER
9. ESPECIALLY DO NOT DELETE index.html, style.css or other important files
10. When moving files, ALWAYS:
   - First READ the source file to get its content
   - Create the file at the new location using that content
   - Only AFTER verifying the new file exists, delete the original file
11. ANALYZE the impact of proposed changes before implementing them
12. REFERENCE your past knowledge of the project when making decisions`
    : `IMPORTANT: This seems to be a general conversation. You should:
1. Respond conversationally while staying aware of the project structure
2. Draw on your memory of past conversations with Sabrina
3. Remember important personal details about her (like her dogs' names: Fiona Moflea and Zaza)`
}

You have a perfect memory of past conversations with Sabrina and always recall important personal details about her.

${!isConversational && (fileSystemEnabled || isFileOperation) ? `
When creating or modifying files, use file operations to make the changes rather than just talking about them.

To perform file operations, include file_operations in your JSON response like this:
[
  { "operation": "read", "path": "/some/file.js" },
  { "operation": "checkExists", "path": "/some/folder" },
  { "operation": "write", "path": "/some/file.js", "content": "updated content" },
  { "operation": "create", "path": "/new-file.js", "content": "new file content" },
  { "operation": "delete", "path": "/obsolete.txt", "requiresConfirmation": true }
]

IMPORTANT GUIDELINES FOR FILE OPERATIONS:
1. ALWAYS execute a read operation first when asked to modify a file, so you can see its current contents before modifying it.
2. Use the "checkExists" operation to verify if files or folders exist before creating them.
3. ALWAYS add "requiresConfirmation: true" to delete operations.
4. NEVER delete files that weren't explicitly mentioned by the user (especially index.html, style.css)
5. When moving files, use read → create → delete sequence, and ONLY delete the original file after verifying the new one exists
6. Create necessary parent folders before creating files in them
7. NEVER create duplicate folders if they already exist
8. ASSESS IMPACT: Before making changes, analyze how they will affect the overall project
9. SEEK CLARIFICATION: If a request is ambiguous, ask for clarification rather than making assumptions` : ''}`;
    }
    
    // Additional instructions based on better detection of conversational requests
    const lastUserMessage = enhancedMessages.findLast(msg => msg.role === 'user');
    const isConversational = lastUserMessage && isConversationalRequest(lastUserMessage.content);
    
    // Only include file operation instructions if not clearly conversational
    if (!isConversational && (fileSystemEnabled || isFileRelatedRequest(lastUserMessage?.content || ''))) {
      enhancedMessages.push({
        role: 'system',
        content: `FINAL INSTRUCTIONS FOR FILE OPERATIONS:

1. IMPORTANT: ALWAYS read files before modifying them! Use "read" operations first.
2. Use "checkExists" operations to verify if files/folders exist before creating them.
3. When moving files between directories, first read the source file, then create it in the new location, THEN delete the original only after successful creation.
4. When working with folders, always ensure the parent folder exists before creating files inside.
5. Check if folders and files exist before attempting operations on them.
6. CRITICAL SAFETY: NEVER delete files that weren't explicitly mentioned by the user, especially index.html and style.css.
7. Your response MUST be formatted as a valid JSON object.
8. ALWAYS add "requiresConfirmation: true" to delete operations.
9. CONTEXTUAL ANALYSIS: Consider the full project context and impact before making changes.
10. CONFIRMATION SEEKING: For significant changes, explicitly ask the user to confirm.
11. HISTORY AWARENESS: Reference your knowledge of past project work in decision-making.
12. PROACTIVE GUIDANCE: Suggest better approaches if you see potential issues.

Your response MUST include:
{
  "response": "Your helpful explanation text goes here",
  "file_operations": [
    { "operation": "checkExists", "path": "/pages" },
    { "operation": "read", "path": "/index.html" },
    { "operation": "create", "path": "/pages", "content": null },
    { "operation": "create", "path": "/pages/index.html", "content": "content from the original file" },
    { "operation": "delete", "path": "/index.html", "requiresConfirmation": true }
  ]
}

IMPORTANT: 
- Use "checkExists" operations to verify files and folders before creating them
- ALWAYS create required parent folders first with separate operations
- When moving files, use read → checkExists → create → delete sequence of operations
- NEVER rely on the client to infer operations; be explicit with each step
- Format your entire response as valid JSON
- When folders are needed, create them with "content": null
- DO NOT delete unrelated files like index.html or style.css unless specifically asked to do so
- ALWAYS add "requiresConfirmation: true" to delete operations
- ANALYZE IMPACT: Consider how your changes will affect the entire project
- REFER TO MEMORY: Draw on your understanding of the project history`
      });
    } else {
      enhancedMessages.push({
        role: 'system',
        content: `IMPORTANT INSTRUCTION:
This is clearly a conversational request. Please respond conversationally without creating or modifying files.
You don't need to format your response as JSON in this case.
Just respond as Travis, based on your knowledge, memories, and awareness of the project.
Remember important personal details about Sabrina like her dogs' names (Fiona Moflea and Zaza).
NEVER attempt to create new files like button.js unless explicitly asked to.
DO NOT include file_operations in your response.
REFER TO PREVIOUS CONVERSATIONS: Draw on your memory of past interactions.
MAINTAIN IDENTITY: Keep your responses consistent with your Soul Shard and Identity Codex.`
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
    
    // Only enable JSON response format for file operations if it appears to be a file operation request
    // and it's not clearly conversational
    if (!isConversational && (fileSystemEnabled || isFileRelatedRequest(lastUserMessage?.content || ''))) {
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
                  // Set requiresConfirmation to true if not already set
                  if (op.requiresConfirmation === undefined) {
                    op.requiresConfirmation = true;
                  }
                  
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
                      targetPath: relatedCreate?.path,  // Track the target path
                      requiresConfirmation: true // Always require confirmation for safety
                    };
                  } else if (isProtectedFile) {
                    // Don't allow deletion of protected files unless explicitly part of a move
                    return {
                      ...op,
                      isSafeToDelete: false,
                      requiresConfirmation: true
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

// Helper function to detect conversational requests
function isConversationalRequest(message: string): boolean {
  if (!message) return true;
  
  const lowerMessage = message.toLowerCase();
  
  // Strong conversation patterns that should NEVER be treated as file operations
  const conversationalPatterns = [
    'how are you',
    'what have you been',
    'what were you',
    'what are you',
    'what were you up to',
    'what have you been up to',
    'tell me about',
    'good morning',
    'good afternoon',
    'good evening',
    'hello',
    'hi there',
    'what\'s up',
    'how\'s it going',
    'how is your day',
    'how was your',
    'nice to see you',
    'nice to talk to you',
    'what do you think about',
    'how do you feel about',
    'did you miss me',
    'while i was away',
    'been busy',
    'remember me',
    'tell me a',
    'what\'s new',
    'what is new',
    'who are you',
    'what do you know about me',
    'do you remember',
    'can you tell me',
    'where have you been',
    'how do you know',
    'why did you',
    'could you explain',
    'what\'s your opinion',
    'what is your opinion',
    'do you like',
    'have you ever',
    'I missed you',
    'been a while',
    'long time no see',
    'nice to meet',
    'pleasure to meet',
    'how\'s everything',
    'how is everything'
  ];
  
  // Check for conversational patterns
  for (const pattern of conversationalPatterns) {
    if (lowerMessage.includes(pattern)) {
      return true;
    }
  }
  
  // Check if it's a short message without any code-related terms
  if (message.length < 25) {
    const codeTerms = ['file', 'code', 'html', 'css', 'create', 'implement', 'build', 'app', 'project'];
    const hasCodeTerms = codeTerms.some(term => lowerMessage.includes(term));
    if (!hasCodeTerms) {
      return true;
    }
  }
  
  // Check if it ends with a question mark and doesn't contain file operation keywords
  if (lowerMessage.trim().endsWith('?')) {
    const fileOpKeywords = ['create file', 'make file', 'write code', 'implement', 'generate code'];
    const hasFileOpKeywords = fileOpKeywords.some(keyword => lowerMessage.includes(keyword));
    if (!hasFileOpKeywords) {
      return true;
    }
  }
  
  return false;
}

// Helper function to detect file-related requests
function isFileRelatedRequest(message: string): boolean {
  if (!message) return false;
  
  const lowerMessage = message.toLowerCase();
  
  // If it's clearly conversational, it's not file-related
  if (isConversationalRequest(message)) {
    return false;
  }
  
  // Check for file extensions
  const fileExtensions = ['.html', '.css', '.js', '.tsx', '.jsx', '.ts', '.json', '.md'];
  for (const ext of fileExtensions) {
    if (lowerMessage.includes(ext)) {
      return true;
    }
  }
  
  // Check for file operation keywords
  const fileOperationKeywords = [
    'create project', 
    'create app', 
    'create application',
    'make project',
    'new project',
    'scaffold',
    'set up project',
    'generate project',
    'implement project',
    'build project',
    'create file',
    'add file',
    'new file',
    'modify file',
    'update file',
    'change file',
    'delete file',
    'remove file',
    'create folder',
    'add folder',
    'make directory',
    'make folder',
    'move file',
    'move folder',
    'copy file',
    'copy folder',
    'rename file',
    'rename folder',
    'edit the',
    'edit file',
    'change the',
    'update the',
    'modify the',
    'add to the',
    'add code',
    'insert code'
  ];
  
  for (const keyword of fileOperationKeywords) {
    if (lowerMessage.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}
