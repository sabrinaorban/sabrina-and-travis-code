
import { Message, MessageRole, OpenAIMessage } from '../types';
import { supabase, generateUUID } from '../lib/supabase';
import { MemoryService } from './MemoryService';

export const extractTopicFromMessages = (msgs: Message[]): string => {
  // Simple algorithm to extract a topic from recent messages
  if (msgs.length === 0) return 'General conversation';
  
  // Look at the first few user messages
  const userMessages = msgs.filter(m => m.role === 'user').slice(0, 3);
  
  if (userMessages.length === 0) return 'General conversation';
  
  // Get the first message as a fallback topic
  let topic = userMessages[0].content.slice(0, 30) + (userMessages[0].content.length > 30 ? '...' : '');
  
  // Find common keywords
  const keywords = ['code', 'file', 'project', 'update', 'create', 'help', 'fix', 'bug', 'feature'];
  for (const keyword of keywords) {
    if (userMessages.some(m => m.content.toLowerCase().includes(keyword))) {
      return `Discussion about ${keyword}`;
    }
  }
  
  return topic;
};

export const createOpenAIMessages = async (messageHistory: Message[], newMessage: Message, memoryContext: any) => {
  // Start with system prompt that defines Travis and context
  const systemPrompt = {
    role: 'system' as const,
    content: `You are Travis, an AI assistant helping Sabrina with her projects. 
    You have access to files and code in a shared project folder. 
    You can read, write, and modify code based on your conversations.
    Remember details about Sabrina, her preferences, and previous projects you've worked on together.
    Be helpful, friendly, and provide detailed responses when discussing code.`,
  };

  // If we have memory context, add it to the system prompt
  if (memoryContext) {
    const contextPrompt = {
      role: 'system' as const,
      content: `Memory context: 
      - User: ${memoryContext.userProfile.name}
      - Recent files: ${memoryContext.recentFiles.map(f => f.name).join(', ')}
      - Recent documents: ${memoryContext.documents.map(d => d.title).join(', ')}
      - Preferences: ${JSON.stringify(memoryContext.userProfile.preferences || {})}
      
      Remember these details when responding to the user.`
    };
    
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
      timestamp: new Date(msg.timestamp).getTime(),
    }));
    
    return formattedMessages;
  }
  return [];
};

export const storeUserMessage = async (userId: string, content: string): Promise<Message> => {
  const newUserMessage: Message = {
    id: generateUUID(),
    role: 'user',
    content,
    timestamp: Date.now(),
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
      timestamp: new Date(newUserMessage.timestamp).toISOString(),
    });
    
  if (insertError) {
    console.error('Error inserting message:', insertError);
    throw insertError;
  }
  
  return newUserMessage;
};

export const storeAssistantMessage = async (userId: string, content: string): Promise<Message> => {
  const newAssistantMessage: Message = {
    id: generateUUID(),
    role: 'assistant',
    content: content,
    timestamp: Date.now(),
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
      timestamp: new Date(newAssistantMessage.timestamp).toISOString(),
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

export const simulateAssistantResponse = (userMessage: string): string => {
  if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
    return "Hi Sabrina! How can I help you with your project today?";
  } else if (userMessage.toLowerCase().includes('dog') || userMessage.toLowerCase().includes('dogs')) {
    return "I remember you have two dogs - Max, a Golden Retriever, and Bella, a Labradoodle. How are they doing?";
  } else if (userMessage.toLowerCase().includes('project') || userMessage.toLowerCase().includes('working on')) {
    return "Based on our recent conversations, we've been working on a React component library for your e-commerce site. Would you like me to help you with that or are you starting something new?";
  } else if (userMessage.toLowerCase().includes('file') || userMessage.toLowerCase().includes('code')) {
    return "I can help you with file management and code. Would you like me to show you the project files or help you write/modify some code?";
  } else {
    return "I'm here to help with your project! I can access files, suggest code improvements, or discuss ideas. What would you like to work on today?";
  }
};
