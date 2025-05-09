
import { Message } from '../../types';
import { MemoryService } from '../MemoryService';

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
  // Check if the message is a question about dog names or personal info
  if (messageContent.toLowerCase().includes('dog') || messageContent.toLowerCase().includes('names')) {
    return "Your dogs' names are Fiona Moflea and Zaza. I remember how important they are to you, Sabrina.";
  }
  
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

// Determine if this is a file operation request
export const isFileOperationRequest = (content: string): boolean => {
  const fileOperationTriggers = [
    // Project creation triggers - given higher priority
    'create project', 'new project', 'set up project', 'setup project',
    'create app', 'new app', 'create application', 'start app', 
    'create next', 'new next', 'create nextjs', 'next app', 'next.js app', 'next.js project',
    'create react', 'new react', 'react app', 'react project',
    'scaffolding', 'scaffold project', 'scaffold app',
    'generate project', 'generate app',
    
    // Generic file operation triggers
    'create file', 'create a file', 'make a file', 'new file',
    'create folder', 'create a folder', 'make a folder', 'new folder',
    'create directory', 'make directory',
    'update file', 'modify file', 'change file', 'edit file', 'edit the file', 
    'delete file', 'remove file',
    'write code', 'implement', 'generate code',
    'create component', 'new component',
    'create vue', 'new vue',
    'edit index.html', 'modify index.html', 'update index.html'
  ];
  
  // These words in questions might suggest the user is asking about project creation
  // but not actually requesting it
  const exclusionPhrases = [
    'how to', 'how do i', 'can you explain', 'tell me about', 
    'what is', 'what are', 'can you describe', 'explain'
  ];
  
  const lowerContent = content.toLowerCase();
  
  // Check if it matches any exclusion phrases (educational questions)
  if (exclusionPhrases.some(phrase => lowerContent.includes(phrase))) {
    // If content includes words like "create" AND educational phrases, prioritize education over action
    return false;
  }
  
  // Action phrases that strongly indicate file operation intent
  const actionPhrases = [
    'generate for me', 'create for me', 'make for me', 'build for me',
    'please create', 'please generate', 'please make', 'please build', 'please edit',
    'can you create', 'can you generate', 'can you make', 'can you build', 'can you edit',
    'you generate', 'you create', 'you make', 'you build', 'you edit'
  ];
  
  // If content contains any strong action phrases, prioritize treating as file operation
  if (actionPhrases.some(phrase => lowerContent.includes(phrase))) {
    return true;
  }
  
  // Otherwise use the standard trigger words
  return fileOperationTriggers.some(trigger => lowerContent.includes(trigger));
};
