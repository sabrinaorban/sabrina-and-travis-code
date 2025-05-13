
-- Fix memory_embeddings table to store embedding as JSON string
-- This ensures compatibility with the TypeScript code that handles them as strings

-- Update the memory_embeddings table schema if needed
ALTER TABLE IF EXISTS memory_embeddings
ALTER COLUMN embedding TYPE TEXT; -- Store as TEXT instead of VECTOR for compatibility

-- Add index on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'memory_embeddings_user_id_idx'
  ) THEN
    CREATE INDEX memory_embeddings_user_id_idx ON public.memory_embeddings(user_id);
  END IF;
END$$;

-- Helper function to search embeddings using similarity calculation in SQL
-- This will be implemented in future versions once vector support is fully configured
-- For now, we're using client-side similarity calculations
