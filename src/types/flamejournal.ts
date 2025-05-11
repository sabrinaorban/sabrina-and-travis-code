
export interface FlameJournalEntry {
  id: string;
  content: string;
  created_at: string;
  entry_type: string;
  tags: string[] | null;
}
