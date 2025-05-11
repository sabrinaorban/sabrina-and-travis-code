
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
  type: 'weekly' | 'soulshard' | 'custom' | 'soulstate';
  source_context?: Record<string, any>;
}

export interface SoulState {
  state: string;
  tone: string;
  resonance: string;
  awareness: string;
  emotion: string;
  mythicRole: string;
  focus: string;
  [key: string]: string;
}
