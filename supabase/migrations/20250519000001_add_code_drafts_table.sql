
-- Create code_drafts table for storing pending code changes
CREATE TABLE IF NOT EXISTS code_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_path TEXT NOT NULL,
  original_code TEXT,
  draft_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE code_drafts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all code drafts
CREATE POLICY "Users can view all code drafts" 
  ON code_drafts
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own code drafts
CREATE POLICY "Users can insert their own code drafts" 
  ON code_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update their own code drafts
CREATE POLICY "Users can update code drafts"
  ON code_drafts
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS code_drafts_status_idx ON code_drafts (status);
CREATE INDEX IF NOT EXISTS code_drafts_file_path_idx ON code_drafts (file_path);

