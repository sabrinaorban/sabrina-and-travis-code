
import { Json } from '@/integrations/supabase/types';

export interface FlameJournalEntry {
  id: string;
  content: string;
  created_at: string;
  entry_type: string;
  tags: string[] | null;
  title?: string;
  user_id?: string;
  updated_at?: string;
  metadata?: Json | null;
  status?: 'draft' | 'published' | 'archived';
}
