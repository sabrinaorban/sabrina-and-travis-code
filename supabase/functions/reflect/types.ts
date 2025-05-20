
export interface Reflection {
  id: string;
  content: string;
  created_at: string;
  author: string;
  type: string;
  source_context: {
    message_count: number;
    memory_context: any;
    task_context?: {
      in_progress: number;
      pending: number;
      completed: number;
      blocked: number;
      in_progress_details?: string[];
      pending_details?: string[];
    } | null;
    prompt_type: string;
  };
}
