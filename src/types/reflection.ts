
export interface Reflection {
  id: string;
  content: string;
  created_at: string;
  author: string;
  type: 'weekly' | 'soulshard' | 'soulstate' | 'custom';
  source_context?: Record<string, any>;
}
