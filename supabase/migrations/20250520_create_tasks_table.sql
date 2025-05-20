
-- Create tasks table for persistent storage
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  related_file TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (will be refined with proper auth later)
CREATE POLICY "Enable all operations for tasks" 
  ON public.tasks 
  FOR ALL 
  TO PUBLIC
  USING (true);

-- Add an index on status for faster queries
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (status);
