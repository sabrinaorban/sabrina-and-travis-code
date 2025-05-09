
import { Message } from '../../types';

export const extractTopicFromMessages = (messages: Message[]): string => {
  // Take the first few messages to determine the topic
  const relevantMessages = messages.slice(0, Math.min(messages.length, 5));
  const concatenatedContent = relevantMessages
    .map(msg => msg.content)
    .join(' ')
    .toLowerCase();
  
  // Try to extract a meaningful topic
  if (concatenatedContent.includes('next.js') || concatenatedContent.includes('nextjs')) {
    return 'Next.js Project';
  } else if (concatenatedContent.includes('react')) {
    return 'React Development';
  } else if (concatenatedContent.includes('javascript') || concatenatedContent.includes('js')) {
    return 'JavaScript Development';
  } else if (concatenatedContent.includes('typescript') || concatenatedContent.includes('ts')) {
    return 'TypeScript Development';
  } else if (concatenatedContent.includes('code') || concatenatedContent.includes('program')) {
    return 'Programming Assistance';
  } else {
    // Generic topic based on length of conversation
    return messages.length > 10 ? 'Extended Technical Discussion' : 'Technical Assistance';
  }
};

export const simulateAssistantResponse = (
  userMessage: string,
  context: {
    githubAuthenticated?: boolean;
    githubUsername?: string;
    currentRepo?: string;
    currentBranch?: string;
  } = {}
): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! I'm Travis, your AI developer assistant. How can I help you today with your project?`;
  }
  
  if (lowerMessage.includes('github') || lowerMessage.includes('repository') || lowerMessage.includes('repo')) {
    if (context.githubAuthenticated) {
      return `I see you're interested in GitHub functionality. You're currently ${context.currentRepo ? `working with the ${context.currentRepo} repository` : 'authenticated with GitHub'}. What would you like to do?`;
    } else {
      return `You're asking about GitHub integration. You can connect your GitHub account to work with repositories directly. Would you like me to help you set that up?`;
    }
  }
  
  if (lowerMessage.includes('next.js') || lowerMessage.includes('nextjs') || lowerMessage.includes('react')) {
    return `I'd be happy to help you with your Next.js/React project. I can create components, set up routing, or help with any specific features you need. What aspect are you working on?`;
  }
  
  if (lowerMessage.includes('file') || lowerMessage.includes('folder') || lowerMessage.includes('directory')) {
    return `I can help you manage your project files. I can create, modify, or delete files and folders. What specifically would you like me to do?`;
  }
  
  // Default fallback response
  return `I'm here to help with your development needs. I can create and modify code, work with your project files, and provide technical guidance. What specific task would you like assistance with?`;
};

export const generateConversationSummary = async (messages: Message[]): Promise<string> => {
  // Simple implementation that concatenates key points
  const messageCount = messages.length;
  const userMessages = messages.filter(msg => msg.role === 'user');
  const assistantMessages = messages.filter(msg => msg.role === 'assistant');
  
  // Take the first message as topic indicator
  const firstUserMessage = userMessages.length > 0 ? userMessages[0].content : '';
  const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
  
  // Determine the general topic
  const topic = extractTopicFromMessages(messages);
  
  return `Conversation about ${topic} with ${messageCount} messages. Started with user asking about "${firstUserMessage.substring(0, 100)}${firstUserMessage.length > 100 ? '...' : ''}". Most recently discussed "${lastUserMessage.substring(0, 100)}${lastUserMessage.length > 100 ? '...' : ''}".`;
};

export const isFileOperationRequest = (content: string): boolean => {
  // Convert to lowercase for case-insensitive matching
  const lowerContent = content.toLowerCase();
  
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
    'make folder'
  ];
  
  // Check for exact matches of keywords
  for (const keyword of fileOperationKeywords) {
    if (lowerContent.includes(keyword)) {
      return true;
    }
  }
  
  // Check for combinations of actions and targets
  const actions = ['create', 'make', 'generate', 'build', 'implement', 'add', 'setup', 'develop'];
  const targets = ['nextjs', 'next.js', 'react', 'app', 'application', 'project', 'component', 'website'];
  
  for (const action of actions) {
    for (const target of targets) {
      const pattern = `${action}\\s+(?:a|an)?\\s*${target}`;
      if (new RegExp(pattern, 'i').test(lowerContent)) {
        return true;
      }
    }
  }
  
  // Check for common framework-specific commands
  if (lowerContent.includes('next.js') || 
      lowerContent.includes('nextjs') || 
      lowerContent.includes('react app') ||
      lowerContent.includes('create-react-app')) {
    return true;
  }
  
  return false;
};
