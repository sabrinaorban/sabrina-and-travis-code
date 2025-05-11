
// Define message types for better type safety
export interface Message {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Reflection {
  id: string;
  content: string;
  created_at: string;
  author: string;
  type: 'weekly' | 'soulshard' | 'custom';
  source_context?: Record<string, any>;
}
