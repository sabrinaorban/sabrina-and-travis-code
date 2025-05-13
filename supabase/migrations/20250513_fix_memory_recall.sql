
-- Update to ensure memory_embeddings table is properly set up with pgvector

-- Ensure memory_embeddings table exists with correct structure
CREATE TABLE IF NOT EXISTS public.memory_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  message_type TEXT NOT NULL DEFAULT 'chat',
  tags TEXT[] DEFAULT '{}'::TEXT[],
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index to make similarity search faster if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'memory_embeddings_embedding_idx'
  ) THEN
    CREATE INDEX memory_embeddings_embedding_idx ON public.memory_embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  END IF;
END$$;

-- Add an index on user_id to make filtering faster if not exists
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

-- Ensure we have the function to match memories
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  user_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    memory_embeddings.id,
    memory_embeddings.content,
    1 - (memory_embeddings.embedding <=> query_embedding) AS similarity
  FROM memory_embeddings
  WHERE 1 - (memory_embeddings.embedding <=> query_embedding) > match_threshold
  AND memory_embeddings.user_id = match_memories.user_id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
