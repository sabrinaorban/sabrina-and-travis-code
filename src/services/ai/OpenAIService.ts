
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
Remember important personal details about Sabrina like her dogs' names (Fiona Moflea and Zaza) and other personal information.
`;

  const fileOperationsPrompt = `
CRITICAL INSTRUCTIONS: Before making ANY file changes, ALWAYS:
1. First READ all relevant files to understand the current state
2. DO NOT delete any existing files unless explicitly asked to do so
3. When moving files, create the new file first, then delete the original only after confirming the new one exists
4. Always check if a file exists before trying to modify or delete it
5. Preserve all existing project files (like index.html, style.css) even when creating new folders or files

When asked to create projects or implement features, you MUST:
1. Look at the existing project structure to understand what you're working with
2. Make direct changes to the necessary files using file operations
3. Create new files as needed 
4. Explain what you've done

To perform file operations, include file_operations in your JSON response like this:
[
  { "operation": "read", "path": "/some/file.js" },
  { "operation": "write", "path": "/some/file.js", "content": "updated content" },
  { "operation": "create", "path": "/new-file.js", "content": "new file content" },
  { "operation": "delete", "path": "/obsolete.txt" }
]

WHEN MOVING FILES:
1. First read the original file
2. Then create the file at the new location with the same content
3. Only delete the original file after confirming the new one was created successfully

WHEN CREATING A FOLDER OR NEW FILE:
1. First check what files already exist
2. Create the new folder or file without disturbing existing files
3. DO NOT delete or modify any files unless explicitly asked to do so
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
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: 'user',
      content: newUserMessage.content,
    },
  ];

  return openAIMessages;
};

// Function to call the OpenAI API through Supabase Edge Function
export const callOpenAI = async (
  openAIMessages: OpenAIMessage[],
  memoryContext: MemoryContext | null,
  fileSystemEnabled: boolean,
  projectStructure: string
) => {
  const { data: response, error: apiError } = await supabase.functions.invoke('openai-chat', {
    body: { 
      messages: openAIMessages,
      memoryContext: memoryContext,
      fileSystemEnabled: fileSystemEnabled,
      projectStructure
    }
  });

  if (apiError) {
    throw apiError;
  }

  return response;
};

// Enhanced detection of file operation requests - make it more sensitive to file editing requests
export const isFileOperationRequest = (message: string): boolean => {
  // Convert to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase();
  
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
    'next.js',
    'nextjs',
    'simple app',
    'simple project',
    'edit the',
    'edit file',
    'change the',
    'update the',
    'modify the',
    'add to the',
    'add code',
    'insert code',
    'add a div',
    'add css',
    'link css',
    'add javascript',
    'add js',
    'add html',
    'edit html',
    'update html',
    'modify html',
    'move file',
    'move folder',
    'rename file',
    'rename folder'
  ];
  
  // Check for exact matches of keywords
  for (const keyword of fileOperationKeywords) {
    if (lowerMessage.includes(keyword)) {
      return true;
    }
  }
  
  // Check for combinations of actions and targets
  const actions = ['create', 'make', 'generate', 'build', 'implement', 'add', 'setup', 'develop', 'edit', 'change', 'update', 'modify', 'insert', 'move', 'rename'];
  const targets = ['nextjs', 'next.js', 'react', 'app', 'application', 'project', 'component', 'website', 'file', 'code', 'html', 'css', 'javascript', 'js', 'index', 'div', 'section', 'page', 'folder', 'directory'];
  
  for (const action of actions) {
    for (const target of targets) {
      const pattern = `${action}\\s+(?:a|an|the)?\\s*${target}`;
      if (new RegExp(pattern, 'i').test(lowerMessage)) {
        return true;
      }
    }
  }
  
  // Check for common framework-specific commands or file references
  if (lowerMessage.includes('next.js') || 
      lowerMessage.includes('nextjs') || 
      lowerMessage.includes('react app') ||
      lowerMessage.includes('create-react-app') ||
      lowerMessage.includes('.html') ||
      lowerMessage.includes('.js') ||
      lowerMessage.includes('.css') ||
      lowerMessage.includes('.tsx') ||
      lowerMessage.includes('.jsx')) {
    return true;
  }
  
  return false;
};
