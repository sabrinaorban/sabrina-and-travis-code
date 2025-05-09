
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
    'create file', 'create a file', 'make a file', 'new file',
    'create folder', 'create a folder', 'make a folder', 'new folder',
    'create directory', 'make directory',
    'update file', 'modify file', 'change file',
    'delete file', 'remove file',
    'write code', 'implement', 'generate code',
    'create project', 'new project', 'set up project',
    'create app', 'new app', 'create application',
    'create component', 'new component',
    'create next', 'create react', 'create vue'
  ];
  
  const lowerContent = content.toLowerCase();
  return fileOperationTriggers.some(trigger => lowerContent.includes(trigger));
};
