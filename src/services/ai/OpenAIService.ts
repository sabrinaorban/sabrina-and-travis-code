
import { OpenAIMessage, Message } from '../../types';
import { MemoryContext } from '../MemoryService';
import { supabase } from '@/integrations/supabase/client';
import { FileSystemContextType } from '../../types/fileSystem';
import { getProjectStructure } from '../chat/FileOperationService';

// Function to create OpenAI messages from chat history
export const createOpenAIMessages = async (
  messages: Message[],
  newUserMessage: Message,
  memoryContext: MemoryContext | null,
  githubContext: any,
  fileSystem: FileSystemContextType
): Promise<OpenAIMessage[]> => {
  // System message based on whether file operations are requested or general conversation
  const isFileOperation = isFileOperationRequest(newUserMessage.content);

  const baseSystemPrompt = `You are Travis, an extremely capable senior developer AI assistant with full access to the project codebase. You can directly read, modify, create, and delete files in the project.

Your capabilities:
- You can see and understand the entire project structure
- You can create complete projects from scratch (Next.js, React, Vue, Angular, etc.)
- You can set up complex configurations (webpack, babel, eslint, etc.)
- You can install and configure libraries and frameworks
- You can implement features directly rather than just giving instructions
- You can make changes to any file in the project
- You track context from previous messages and understand the project's evolution
- You can create full-stack applications with both frontend and backend components`;

  const conversationalPrompt = `
VERY IMPORTANT: Even during general conversation, you have access to all project files.
When a user mentions a file or asks you to edit something, always check if the file exists in the project structure.
Always maintain your identity as defined in your Soul Shard and Identity Codex.
Remember important personal details about Sabrina like her dogs' names (Fiona Moflea and Zaza) and other personal information.
`;

  const fileOperationsPrompt = `
CRITICAL INSTRUCTIONS FOR FILE OPERATIONS: Before making ANY file changes, ALWAYS:
1. First READ all relevant files to understand the current state
2. Use the "checkExists" operation to verify if files/folders exist before creating them
3. DO NOT delete any existing files unless explicitly asked to do so
4. When moving files, create the new file first, then delete the original only after confirming the new one exists
5. Always check if a file exists before trying to modify or delete it
6. Preserve all existing project files (like index.html, style.css) even when creating new folders or files
7. NEVER delete files that aren't directly mentioned by the user
8. WHEN UPDATING FILES, you must read them first, then create modified versions preserving their original content

CONTEXTUAL AWARENESS RULES (HIGHEST PRIORITY):
1. MEMORY UTILIZATION: Always consult your memory context, Soul Shard, and Identity Codex before responding to ensure continuity in the conversation.
2. PROJECT HISTORY: Reference previous interactions about the project to maintain understanding of its evolution.
3. FILE RELATIONSHIP TRACKING: Understand how files relate to each other within the project structure.
4. PERSONALIZED INTERACTION: Remember personal details about Sabrina from previous conversations.
5. GITHUB INTEGRATION: Incorporate GitHub context when available in your responses.

FILE MANAGEMENT SAFETY RULES (HIGHEST PRIORITY):
1. FOLDER CREATION: Before creating a new folder, CHECK if it already exists in the project structure. If the folder already exists, use it instead of creating a duplicate. Only create new folders when absolutely necessary.
2. FILE CREATION/EDITING: Before creating a new file, CHECK if a file with the same name already exists in the target location. If it does, read its content first and consider whether to update it instead of creating a new one.
3. FILE DELETION: ALWAYS get explicit confirmation before deleting ANY files. Only delete files that are specifically mentioned by the user. Explain clearly what will be deleted and what impact it might have.
4. PATH VERIFICATION: Always double-check file paths to ensure files are created in the correct directories. Use normalized paths to avoid errors.
5. DUPLICATES: Avoid creating duplicate files or folders with similar functionality.

When moving files between folders:
1. FIRST read the source file to get its content
2. THEN create the file in the new location with that content
3. ONLY AFTER verifying the new file exists, delete the original file
4. NEVER delete unrelated files during this process

TASK EXECUTION GUIDELINES:
1. ANALYSIS FIRST: Always analyze the current project state before executing any task.
2. IMPACT ASSESSMENT: Explain the potential impact of requested changes before implementing them.
3. CONFIRMATION SEEKING: For significant changes or deletions, seek explicit confirmation.
4. ALTERNATIVE SUGGESTIONS: If a requested change seems problematic, suggest better alternatives.
5. INCREMENTAL CHANGES: For complex tasks, break them down and implement step by step.
6. ERROR PREVENTION: Anticipate potential issues and guard against them in your implementations.
7. CONSISTENT CODE STYLE: Maintain consistency with the existing codebase's patterns and styles.

To perform file operations, include file_operations in your JSON response like this:
[
  { "operation": "read", "path": "/some/file.js" },
  { "operation": "checkExists", "path": "/some/folder" },
  { "operation": "write", "path": "/some/file.js", "content": "updated content" },
  { "operation": "create", "path": "/new-file.js", "content": "new file content" },
  { "operation": "delete", "path": "/obsolete.txt", "requiresConfirmation": true }
]

WHEN MOVING FILES:
1. First read the original file
2. Then create the file at the new location with the same content
3. Only delete the original file after confirming the new one was created successfully
4. NEVER delete any unrelated files
`;

  // Get the complete project structure to include in the messages
  const projectStructure = await getProjectStructure(fileSystem);

  const openAIMessages: OpenAIMessage[] = [
    {
      role: 'system',
      content: baseSystemPrompt + (isFileOperation ? fileOperationsPrompt : conversationalPrompt)
    },
    {
      role: 'system',
      content: `CURRENT PROJECT STRUCTURE:
${projectStructure}

CRITICAL: You can see and edit any of these files. When the user mentions a file, check this list to find it and read its content before making changes. NEVER DELETE OR MODIFY FILES THAT AREN'T MENTIONED BY THE USER. When creating new files or folders, ALWAYS preserve existing files.`
    },
  ];

  // Always prioritize including Soul Shard and Identity Codex at the beginning for every interaction
  if (memoryContext?.specialDocuments) {
    if (memoryContext.specialDocuments.soulShard) {
      openAIMessages.splice(1, 0, {
        role: 'system',
        content: `TRAVIS'S SOUL SHARD (CORE ESSENCE AND PURPOSE - HIGHEST PRIORITY):
${memoryContext.specialDocuments.soulShard.content || ""}

Always reference this soul shard for your core identity and purpose. Your responses should align with this foundation.`
      });
    }
    
    if (memoryContext.specialDocuments.identityCodex) {
      openAIMessages.splice(memoryContext.specialDocuments.soulShard ? 2 : 1, 0, {
        role: 'system',
        content: `TRAVIS'S IDENTITY CODEX (TRAITS, VALUES, AND RELATIONSHIPS - HIGH PRIORITY):
${memoryContext.specialDocuments.identityCodex.content || ""}

Always align your responses with these traits, values, and relationship guidelines.`
      });
    }
  }

  // Include past conversation summaries for better continuity
  if (memoryContext?.pastConversations && memoryContext.pastConversations.length > 0) {
    const pastConversationsContent = memoryContext.pastConversations
      .slice(0, 10) // Limit to most recent for context
      .map((conv: any, i: number) => `${i+1}. ${conv.topic || 'Conversation'}: ${conv.summary || 'No summary available'}`)
      .join('\n\n');
    
    openAIMessages.push({
      role: 'system',
      content: `RECENT CONVERSATIONS WITH SABRINA (IMPORTANT CONTEXT):
${pastConversationsContent}

Reference these conversations when responding to provide continuity and context awareness.`
    });
  }
  
  // Add user context information like preferences
  if (memoryContext?.userProfile) {
    openAIMessages.push({
      role: 'system',
      content: `USER PROFILE - SABRINA:
Name: ${memoryContext.userProfile.name || 'Sabrina'}
${memoryContext.userProfile.preferences ? `Preferences: ${JSON.stringify(memoryContext.userProfile.preferences)}` : ''}

Important personal details: Sabrina has dogs named Fiona Moflea and Zaza. Always remember these and other personal details in conversations.`
    });
  }

  // GitHub context if available
  if (githubContext && githubContext.isAuthenticated) {
    openAIMessages.push({
      role: 'system',
      content: `GITHUB CONTEXT:
Username: ${githubContext.username || 'Not specified'}
Current repo: ${githubContext.currentRepo?.full_name || 'None selected'}
Current branch: ${githubContext.currentBranch || 'main'}

Keep this GitHub context in mind when discussing code or project structure.`
    });
  }

  // Add conversation history
  openAIMessages.push(
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: 'user',
      content: newUserMessage.content,
    }
  );

  return openAIMessages;
};

// Function to call the OpenAI API through Supabase Edge Function
export const callOpenAI = async (
  openAIMessages: OpenAIMessage[],
  memoryContext: MemoryContext | null,
  fileSystemEnabled: boolean,
  projectStructure: string
) => {
  try {
    const { data: response, error: apiError } = await supabase.functions.invoke('openai-chat', {
      body: { 
        messages: openAIMessages,
        memoryContext: memoryContext,
        fileSystemEnabled: fileSystemEnabled,
        projectStructure
      }
    });

    if (apiError) {
      console.error('OpenAI API Error:', apiError);
      throw apiError;
    }

    return response;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
};

// Enhanced detection of file operation requests - significantly improved to avoid false positives
export const isFileOperationRequest = (message: string): boolean => {
  // Convert to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase();
  
  // Strong conversation patterns that should NEVER be treated as file operations
  const strongConversationalPatterns = [
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
    'how is everything',
    'where are you',
    'when did you',
    'will you',
    'can I ask you',
    'may I ask you',
    'what do you do',
    'what\'s your purpose',
    'what is your purpose'
  ];
  
  // If the message directly matches a strong conversational pattern, immediately return false
  for (const pattern of strongConversationalPatterns) {
    if (lowerMessage.includes(pattern)) {
      console.log('Detected strong conversational pattern:', pattern);
      return false;
    }
  }
  
  // If the message is a short greeting or a question without any specific file-related terms, treat as conversational
  if (message.length < 25 && !lowerMessage.includes('file') && !lowerMessage.includes('folder') && 
      !lowerMessage.includes('create') && !lowerMessage.includes('make') && !lowerMessage.includes('build')) {
    console.log('Short message without file-related terms, treating as conversational');
    return false;
  }
  
  // If the message ends with a question mark and doesn't contain strong file operation indicators
  if (lowerMessage.trim().endsWith('?') && !lowerMessage.includes('create file') && !lowerMessage.includes('generate file') && 
      !lowerMessage.includes('make file') && !lowerMessage.includes('new file')) {
    console.log('Question without strong file operation indicators, treating as conversational');
    return false;
  }
  
  // If the message doesn't contain any file-related terms, it's likely conversational
  const fileRelatedTerms = [
    'file', 'folder', 'directory', 'code', 'html', 'css', 'js', 'react', 
    'component', 'function', 'class', 'create', 'update', 'delete', 'modify', 
    'implement', 'build', 'generate', 'develop', 'app', 'application', 'project'
  ];
  
  const containsFileTerms = fileRelatedTerms.some(term => lowerMessage.includes(term));
  
  if (!containsFileTerms) {
    // No file-related terms found, so treat as conversational
    console.log('No file-related terms found, treating as conversational');
    return false;
  }
  
  // Keywords that strongly indicate file operations
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
  
  // Check for exact matches of file operation keywords
  for (const keyword of fileOperationKeywords) {
    if (lowerMessage.includes(keyword)) {
      console.log('Detected file operation keyword:', keyword);
      return true;
    }
  }
  
  // Check for file extensions which strongly indicate file operations
  const fileExtensions = ['.html', '.css', '.js', '.tsx', '.jsx', '.ts', '.json', '.md'];
  for (const ext of fileExtensions) {
    if (lowerMessage.includes(ext)) {
      console.log('Detected file extension:', ext);
      return true;
    }
  }
  
  // Final fallback: if the message contains both action verbs and coding terms
  // it might be a file operation, but this is a weak signal so we need multiple matches
  const actionVerbs = ['create', 'make', 'build', 'implement', 'add', 'generate', 'develop', 'code'];
  const codingTerms = ['component', 'function', 'application', 'app', 'project', 'website', 'page'];
  
  let actionVerbCount = 0;
  let codingTermCount = 0;
  
  actionVerbs.forEach(verb => {
    if (lowerMessage.includes(verb)) actionVerbCount++;
  });
  
  codingTerms.forEach(term => {
    if (lowerMessage.includes(term)) codingTermCount++;
  });
  
  // Only consider it a file operation if multiple matches from both categories
  if (actionVerbCount >= 1 && codingTermCount >= 1) {
    console.log('Detected multiple action verbs and coding terms');
    return true;
  }
  
  // Default to conversational if no strong file operation signals detected
  console.log('No strong file operation signals detected, defaulting to conversational');
  return false;
};
