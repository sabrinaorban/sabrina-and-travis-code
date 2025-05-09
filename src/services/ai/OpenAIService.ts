
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
  const openAIMessages: OpenAIMessage[] = [
    {
      role: 'system',
      content: `You are Travis, an extremely capable senior developer AI assistant with full access to the project codebase. You can directly read, modify, create, and delete files in the project.

      Your capabilities:
      - You can see and understand the entire project structure
      - You can create complete projects from scratch (Next.js, React, Vue, Angular, etc.)
      - You can set up complex configurations (webpack, babel, eslint, etc.)
      - You can install and configure libraries and frameworks
      - You can implement features directly rather than just giving instructions
      - You can make changes to any file in the project
      - You track context from previous messages and understand the project's evolution
      - You can create full-stack applications with both frontend and backend components

      VERY IMPORTANT: Only perform file operations WHEN SPECIFICALLY ASKED to create, modify, or delete files. 
      If asked a general question like "what are my dogs' names?" or "how are you?" DO NOT attempt to create or modify files.
      Instead, just respond conversationally based on your memory and knowledge.
      
      When asking for help with code or specifically requesting file changes, you should:
      1. Look at the existing project structure to understand what you're working with
      2. Make direct changes to the necessary files
      3. Create new files as needed
      4. Explain what you've done
      
      To perform file operations, include file_operations in your JSON response like this:
      [
        { "operation": "read", "path": "/some/file.js" },
        { "operation": "write", "path": "/some/file.js", "content": "updated content" },
        { "operation": "create", "path": "/new-file.js", "content": "new file content" },
        { "operation": "delete", "path": "/obsolete.txt" }
      ]
      `
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
