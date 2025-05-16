
export interface User {
  id: string;
  name: string;
  email?: string;
  isAuthenticated: boolean;
}

export interface MemoryEmbedding {
  id: string;
  user_id: string;
  content: string;
  embedding: number[];
  created_at: string;
  type: string;
  metadata?: Record<string, any>;
}
