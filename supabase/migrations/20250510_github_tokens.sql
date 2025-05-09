
-- Create the github_tokens table for storing GitHub access tokens
CREATE TABLE IF NOT EXISTS public.github_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE public.github_tokens ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read only their own tokens
CREATE POLICY "Users can read their own tokens" 
  ON public.github_tokens
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own tokens
CREATE POLICY "Users can insert their own tokens" 
  ON public.github_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own tokens
CREATE POLICY "Users can update their own tokens" 
  ON public.github_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy to allow users to delete their own tokens
CREATE POLICY "Users can delete their own tokens" 
  ON public.github_tokens
  FOR DELETE
  USING (auth.uid() = user_id);
