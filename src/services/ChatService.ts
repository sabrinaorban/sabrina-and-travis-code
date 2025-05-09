import { OpenAIMessage, Message, FileEntry } from '../types';
import { MemoryContext } from './MemoryService';
import { FileSystemContextType } from '../types/fileSystem';
import { supabase } from '@/integrations/supabase/client';

// Function to fetch chat messages from Supabase Edge Function
export const fetchMessages = async (userId: string): Promise<Message[]> => {
  try {
    // Fix: Use query parameters instead of body for GET requests
    const { data, error } = await supabase.functions.invoke('messages', {
      method: 'GET',
      headers: {
        'x-user-id': userId
      }
    });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

// Function to store a user message in Supabase
export const storeUserMessage = async (userId: string, content: string): Promise<Message> => {
  try {
    const { data, error } = await supabase.functions.invoke('messages', {
      method: 'POST',
      body: { userId, content, role: 'user' }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing user message:', error);
    throw error;
  }
};

// Function to store an assistant message in Supabase
export const storeAssistantMessage = async (userId: string, content: string): Promise<Message> => {
  try {
    const { data, error } = await supabase.functions.invoke('messages', {
      method: 'POST',
      body: { userId, content, role: 'assistant' }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing assistant message:', error);
    throw error;
  }
};

// Function to delete all messages for a user in Supabase
export const deleteAllMessages = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('messages', {
      method: 'DELETE',
      body: { userId }
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting all messages:', error);
    throw error;
  }
};

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

      When asked to make changes or implement features:
      1. Look at the existing project structure to understand what you're working with
      2. Make direct changes to the necessary files
      3. Create new files as needed
      4. Explain what you've done
      
      IMPORTANT: Always use file operations to make changes rather than just talking about them. If asked to create a new project or feature, ACTUALLY CREATE THE FILES.
      
      To perform file operations, include file_operations in your JSON response like this:
      [
        { "operation": "read", "path": "/some/file.js" },
        { "operation": "write", "path": "/some/file.js", "content": "updated content" },
        { "operation": "create", "path": "/new-file.js", "content": "new file content" },
        { "operation": "delete", "path": "/obsolete.txt" }
      ]
      
      You have access to the following information:
      - The current project structure: ${await getProjectStructure(fileSystem)}
      - The current user's profile: ${JSON.stringify(memoryContext?.userProfile)}
      - The current user's recent files: ${JSON.stringify(memoryContext?.recentFiles)}
      - The current user's important documents: ${JSON.stringify(memoryContext?.documents)}
      ${githubContext ? `- The current user's GitHub context: username=${githubContext.username}, currentRepo=${githubContext.currentRepo}, currentBranch=${githubContext.currentBranch}` : ''}
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

// Function to extract a topic from messages
export const extractTopicFromMessages = (messages: Message[]): string => {
  // Extract keywords or topic from the messages
  const allMessagesContent = messages.map(msg => msg.content).join(' ');
  
  // Basic keyword extraction (can be improved with NLP techniques)
  const keywords = allMessagesContent.split(' ').slice(0, 5).join(' ');
  
  return keywords;
};

// Function to simulate an assistant response (fallback)
export const simulateAssistantResponse = (messageContent: string, githubContext?: any): string => {
  // Simulate Travis's response based on the message content
  if (messageContent.includes('GitHub') || messageContent.includes('repository')) {
    if (githubContext?.githubAuthenticated) {
      return `I see you're asking about GitHub. You are currently authenticated as ${githubContext.githubUsername} and working on the repository ${githubContext.currentRepo} on branch ${githubContext.currentBranch}.`;
    } else {
      return "I see you're asking about GitHub, but you're not currently authenticated. Please connect to GitHub to proceed.";
    }
  } else if (messageContent.includes('file') || messageContent.includes('folder')) {
    return "I see you're asking about file operations. What would you like to do with the files?";
  } else {
    return "I'm processing your request. Please wait...";
  }
};

// Function to generate a conversation summary
export const generateConversationSummary = async (messages: Message[]): Promise<string> => {
  // Generate a summary of the conversation
  const allMessagesContent = messages.map(msg => msg.content).join(' ');
  
  // Basic summary (can be improved with NLP techniques)
  const summary = allMessagesContent.split(' ').slice(0, 20).join(' ') + '...';
  
  return summary;
};

// Function to get project structure
export const getProjectStructure = async (fileSystem: FileSystemContextType): Promise<string> => {
  if (!fileSystem || !fileSystem.fileSystem) {
    return 'File system not available';
  }
  
  const files = fileSystem.fileSystem.files;
  
  if (!files || files.length === 0) {
    return 'No files found';
  }
  
  const structure = files.map(file => {
    if (file.type === 'file') {
      return `- ${file.path} (file)`;
    } else {
      return `- ${file.path} (folder)`;
    }
  }).join('\n');
  
  return structure;
};

// Handle file operations from the assistant
export const handleFileOperation = async (
  fileSystem: any,
  operation: string,
  path: string,
  content?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!fileSystem) {
      return { success: false, message: 'File system not available' };
    }
    
    // When creating files, ensure parent folders exist
    if (operation === 'create' || operation === 'write') {
      // If it's a folder (content is null)
      if (content === null) {
        await ensureFolderExists(fileSystem, path);
        return { success: true, message: `Folder ${path} created successfully` };
      } else {
        // It's a file, so ensure its parent folder exists
        const lastSlashIndex = path.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          const folderPath = path.substring(0, lastSlashIndex);
          await ensureFolderExists(fileSystem, folderPath);
        }
        
        // Get folder path and file name
        const fileName = path.substring(lastSlashIndex + 1);
        const folderPath = lastSlashIndex === 0 ? '/' : path.substring(0, lastSlashIndex);
        
        // Create the file
        await fileSystem.createFile(folderPath, fileName, content);
        return { success: true, message: `File ${path} created successfully` };
      }
    } else if (operation === 'read') {
      const content = fileSystem.getFileContentByPath(path);
      if (content === null) {
        return { success: false, message: `File not found at path: ${path}` };
      }
      return { success: true, message: `File ${path} read successfully` };
    } else if (operation === 'delete') {
      // Need file ID to delete - get it from path
      const file = fileSystem.getFileByPath(path);
      if (!file) {
        return { success: false, message: `File not found at path: ${path}` };
      }
      
      await fileSystem.deleteFile(file.id);
      return { success: true, message: `File ${path} deleted successfully` };
    } else {
      return { success: false, message: `Unsupported operation: ${operation}` };
    }
  } catch (error: any) {
    console.error(`Error performing file operation ${operation} on ${path}:`, error);
    return {
      success: false,
      message: error.message || `Failed to ${operation} file ${path}`
    };
  }
};

// Helper function to ensure a folder exists, creating parent folders as needed
const ensureFolderExists = async (fileSystem: any, folderPath: string): Promise<void> => {
  if (folderPath === '/' || folderPath === '') return;
  
  // Check if folder exists
  const folder = fileSystem.getFileByPath(folderPath);
  if (folder) return;
  
  // Need to create folder - ensure parent folders exist first
  const segments = folderPath.split('/').filter(Boolean);
  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const nextPath = currentPath === '' ? `/${segment}` : `${currentPath}/${segment}`;
    const folder = fileSystem.getFileByPath(nextPath);
    
    if (!folder) {
      // Create this folder - path is parent, name is segment
      const parentPath = currentPath === '' ? '/' : currentPath;
      await fileSystem.createFolder(parentPath, segment);
      console.log(`Created folder ${nextPath}`);
    }
    
    currentPath = nextPath;
  }
};
