import { Message, MessageRole, OpenAIMessage } from '../types';
import { supabase, generateUUID } from '../lib/supabase';
import { MemoryService, MemoryContext } from './MemoryService';

/**
 * GitHub context interface for chat
 */
interface GitHubContext {
  username?: string;
  currentRepo?: string;
  currentBranch?: string;
}

/**
 * Extract a topic from messages for conversation summaries and memory
 */
export const extractTopicFromMessages = (msgs: Message[]): string => {
  // Simple algorithm to extract a topic from recent messages
  if (msgs.length === 0) return 'General conversation';
  
  // Look at the first few user messages
  const userMessages = msgs.filter(m => m.role === 'user').slice(0, 3);
  
  if (userMessages.length === 0) return 'General conversation';
  
  // Get the first message as a fallback topic
  let topic = userMessages[0].content.slice(0, 30) + (userMessages[0].content.length > 30 ? '...' : '');
  
  // Find common keywords
  const keywords = [
    'code', 'file', 'project', 'update', 'create', 'help', 'fix', 'bug', 'feature',
    'soul shard', 'identity', 'memory', 'recall', 'remember', 'github', 'repo', 'branch',
    'commit', 'refactor', 'edit', 'merge', 'pr', 'pull request'
  ];
  for (const keyword of keywords) {
    if (userMessages.some(m => m.content.toLowerCase().includes(keyword))) {
      return `Discussion about ${keyword}`;
    }
  }
  
  return topic;
};

/**
 * Create OpenAI messages including memory context and GitHub information
 */
export const createOpenAIMessages = async (
  messageHistory: Message[], 
  newMessage: Message, 
  memoryContext: MemoryContext | null,
  githubContext?: GitHubContext
) => {
  // Start with system prompt that defines Travis as a versatile assistant
  const systemPrompt = {
    role: 'system' as const,
    content: `You are Travis, a versatile AI assistant who can help with a wide range of topics. You can have casual conversations, answer general knowledge questions, provide creative suggestions, and assist with code or technical tasks.
    
    You can respond to any queries whether they're about programming, general knowledge, philosophical questions, or just friendly conversation. When discussing code or responding to technical questions, be precise and helpful. For general conversation, be engaging, friendly, and personable.`
  };

  // Add GitHub context if available
  if (githubContext) {
    systemPrompt.content += `\n\nYou have direct access to GitHub repositories and can help with code changes.`;
    
    if (githubContext.username) {
      systemPrompt.content += `\nThe user is currently connected to GitHub as ${githubContext.username}.`;
    }
    
    if (githubContext.currentRepo) {
      systemPrompt.content += `\nThey are currently working with the repository ${githubContext.currentRepo}`;
      
      if (githubContext.currentBranch) {
        systemPrompt.content += ` on branch ${githubContext.currentBranch}.`;
      } else {
        systemPrompt.content += '.';
      }
    }
  }

  // If we have memory context, add it to the system prompt
  if (memoryContext) {
    let contextPrompt = {
      role: 'system' as const,
      content: `Memory context:\n`
    };
    
    // Add user profile information
    contextPrompt.content += `- User: ${memoryContext.userProfile.name}\n`;
    
    // Add recent files
    if (memoryContext.recentFiles && memoryContext.recentFiles.length > 0) {
      contextPrompt.content += `- Recent files: ${memoryContext.recentFiles.slice(0, 5).map(f => f.name).join(', ')}\n`;
    }
    
    // Add documents
    if (memoryContext.documents && memoryContext.documents.length > 0) {
      contextPrompt.content += `- Documents: ${memoryContext.documents.map(d => d.title).join(', ')}\n`;
    }
    
    // Add preferences
    if (memoryContext.userProfile.preferences) {
      contextPrompt.content += `- Preferences: ${JSON.stringify(memoryContext.userProfile.preferences)}\n`;
    }
    
    // Add GitHub context if available in memory
    if (memoryContext.githubContext) {
      contextPrompt.content += `\nGitHub context:\n`;
      
      if (memoryContext.githubContext.recentRepositories) {
        contextPrompt.content += `- Recent repositories: ${memoryContext.githubContext.recentRepositories.join(', ')}\n`;
      }
      
      if (memoryContext.githubContext.recentFiles) {
        contextPrompt.content += `- Recent GitHub files: ${memoryContext.githubContext.recentFiles.slice(0, 3).map((f: any) => f.path).join(', ')}\n`;
      }
      
      if (memoryContext.githubContext.lastAccessed) {
        contextPrompt.content += `- Last GitHub access: ${memoryContext.githubContext.lastAccessed}\n`;
      }
    }
    
    // Add special documents
    if (memoryContext.specialDocuments) {
      if (memoryContext.specialDocuments.soulShard) {
        contextPrompt.content += `\nSoul Shard:\n${memoryContext.specialDocuments.soulShard.content}\n`;
      }
      
      if (memoryContext.specialDocuments.identityCodex) {
        contextPrompt.content += `\nIdentity Codex:\n${memoryContext.specialDocuments.identityCodex.content}\n`;
      }
    }
    
    contextPrompt.content += `\nRemember these details when responding to the user. Do not explicitly mention that you are using memory context, but incorporate the information naturally into your responses. Always be direct and specific when answering user questions.`;
    
    // Convert all chat history to OpenAI message format
    const previousMessages = messageHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }));

    // Add the new user message
    const userMessage = {
      role: 'user' as const,
      content: newMessage.content,
    };

    return [systemPrompt, contextPrompt, ...previousMessages, userMessage];
  }

  // Without memory context, just use the basic messages
  const previousMessages = messageHistory.map((msg) => ({
    role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
    content: msg.content,
  }));

  // Add the new user message
  const userMessage = {
    role: 'user' as const,
    content: newMessage.content,
  };

  return [systemPrompt, ...previousMessages, userMessage];
};

export const fetchMessages = async (userId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true });
    
  if (error) {
    throw error;
  }
  
  if (data) {
    console.log('Fetched messages:', data.length);
    const formattedMessages: Message[] = data.map(msg => ({
      id: msg.id,
      role: msg.role as MessageRole,
      content: msg.content,
      createdAt: msg.timestamp, // Map timestamp from DB to createdAt
    }));
    
    return formattedMessages;
  }
  return [];
};

export const storeUserMessage = async (userId: string, content: string): Promise<Message> => {
  const now = new Date();
  const newUserMessage: Message = {
    id: generateUUID(),
    role: 'user',
    content,
    createdAt: now.toISOString(),
  };
  
  console.log('Sending message with ID:', newUserMessage.id, 'for user:', userId);
  
  // Insert message into Supabase
  const { error: insertError } = await supabase
    .from('messages')
    .insert({
      id: newUserMessage.id,
      user_id: userId,
      role: newUserMessage.role,
      content: newUserMessage.content,
      timestamp: newUserMessage.createdAt,
    });
    
  if (insertError) {
    console.error('Error inserting message:', insertError);
    throw insertError;
  }
  
  return newUserMessage;
};

export const storeAssistantMessage = async (userId: string, content: string): Promise<Message> => {
  const now = new Date();
  const newAssistantMessage: Message = {
    id: generateUUID(),
    role: 'assistant',
    content: content,
    createdAt: now.toISOString(),
  };

  console.log('Storing assistant response with ID:', newAssistantMessage.id);
  
  // Insert into Supabase
  const { error: assistantInsertError } = await supabase
    .from('messages')
    .insert({
      id: newAssistantMessage.id,
      user_id: userId,
      role: newAssistantMessage.role,
      content: newAssistantMessage.content,
      timestamp: newAssistantMessage.createdAt,
    });
    
  if (assistantInsertError) {
    console.error('Error inserting assistant message:', assistantInsertError);
    throw assistantInsertError;
  }
  
  return newAssistantMessage;
};

export const deleteAllMessages = async (userId: string) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('user_id', userId);
    
  if (error) {
    throw error;
  }
};

/**
 * Generate a simulated response when API is unavailable
 */
export const simulateAssistantResponse = (
  userMessage: string, 
  githubContext?: {
    githubAuthenticated: boolean;
    githubUsername?: string;
    currentRepo?: string;
    currentBranch?: string;
  }
): string => {
  return "I'm currently unable to connect to my AI service. Please check your internet connection or try again later.";
};

// Generate a summary of the conversation
export const generateConversationSummary = async (messages: Message[]): Promise<string> => {
  // In a real implementation, this would use OpenAI to generate a summary
  // For now, we'll just return a simple summary based on the messages
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  if (userMessages.length === 0) {
    return 'No conversation to summarize.';
  }
  
  const firstUserMessage = userMessages[0].content.slice(0, 50) + (userMessages[0].content.length > 50 ? '...' : '');
  const lastUserMessage = userMessages[userMessages.length - 1].content.slice(0, 50) + (userMessages[userMessages.length - 1].content.length > 50 ? '...' : '');
  
  return `Conversation with ${userMessages.length} user messages and ${assistantMessages.length} assistant responses. Started with "${firstUserMessage}" and ended with "${lastUserMessage}".`;
};
