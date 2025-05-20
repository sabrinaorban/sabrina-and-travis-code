
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  relatedFile?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}
