
import { OpenAIMessage, Message } from '../../types';
import { MemoryContext } from '../MemoryService';
import { supabase } from '@/integrations/supabase/client';
import { FileSystemContextType } from '../../types/fileSystem';

// Function to create OpenAI messages from chat history
export const createOpenAIMessages = async (
  messages: Message[],
  newUserMessage: Message,
  memoryContext: MemoryContext | null,
  githubContext: any,
  fileSystem: FileSystemContextType
): Promise<OpenAIMessage[]> => {
  // System message based on whether file operations are requested or general conversation
  const isFileOperation = messages.length > 0 && 
    /create|make|generate|build|implement|code|project|app|application/i.test(newUserMessage.content);

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
VERY IMPORTANT: This is a GENERAL CONVERSATION. The user is asking a question and wants a normal conversation.
You MUST NOT attempt to create or modify files - just respond conversationally as Travis based on your memories.
Remember important personal details about Sabrina like her dogs' names (Fiona Moflea and Zaza) and other personal information.
`;

  const fileOperationsPrompt = `
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

WHEN CREATING A PROJECT LIKE NEXT.JS:
1. First create all required directories (pages, public, styles, etc.)
2. Then create all essential files (package.json, next.config.js, etc.)
3. Implement a basic working application structure with index.js and components
4. DO NOT just describe how to create the project - actually create it using file operations
`;

  const openAIMessages: OpenAIMessage[] = [
    {
      role: 'system',
      content: baseSystemPrompt + (isFileOperation ? fileOperationsPrompt : conversationalPrompt)
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
