
export interface Reflection {
  id: string;
  content: string;
  created_at: string;
  author: string;
  type: 'weekly' | 'soulshard' | 'custom';
  source_context?: Record<string, any>;
}
