
-- Create a new SQL migration to improve pgvector memory storage and retrieval

-- Install extension if not exists
CREATE EXTENSION IF NOT EXISTS pgvector;

-- Ensure memory_embeddings table exists with correct structure
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'memory_embeddings'
  ) THEN
    CREATE TABLE public.memory_embeddings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      embedding TEXT, -- Store as TEXT for better compatibility
      message_type TEXT NOT NULL DEFAULT 'chat',
      tags TEXT[] DEFAULT '{}'::TEXT[],
      user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Create a match_memories function that works with string-stored embeddings
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding FLOAT[], 
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
DECLARE
  r RECORD;
  embedding_vector FLOAT[];
  dot_product FLOAT;
  query_norm FLOAT := 0;
  vec_norm FLOAT;
  i INT;
BEGIN
  -- Calculate query vector norm
  FOR i IN 1..array_length(query_embedding, 1) LOOP
    query_norm := query_norm + (query_embedding[i] * query_embedding[i]);
  END LOOP;
  query_norm := sqrt(query_norm);
  
  -- For each embedding record
  FOR r IN 
    SELECT id, content, embedding::text AS embedding_text
    FROM memory_embeddings
    WHERE user_id = match_memories.user_id
  LOOP
    BEGIN
      -- Try to parse the embedding from JSON string
      embedding_vector := array_agg(f)::float[] FROM json_array_elements_text(r.embedding_text::json) AS f;
      
      -- Skip if array lengths don't match
      CONTINUE WHEN array_length(embedding_vector, 1) != array_length(query_embedding, 1);
      
      -- Calculate cosine similarity
      dot_product := 0;
      vec_norm := 0;
      
      FOR i IN 1..array_length(query_embedding, 1) LOOP
        dot_product := dot_product + (query_embedding[i] * embedding_vector[i]);
        vec_norm := vec_norm + (embedding_vector[i] * embedding_vector[i]);
      END LOOP;
      
      vec_norm := sqrt(vec_norm);
      
      -- Skip if either norm is zero
      CONTINUE WHEN query_norm = 0 OR vec_norm = 0;
      
      -- Calculate and check similarity
      similarity := dot_product / (query_norm * vec_norm);
      
      IF similarity > match_threshold THEN
        id := r.id;
        content := r.content;
        RETURN NEXT;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Skip records with parsing errors
        CONTINUE;
    END;
  END LOOP;
  
  -- Final sort and limit
  RETURN QUERY
  SELECT subquery.id, subquery.content, subquery.similarity
  FROM (SELECT * FROM match_memories) AS subquery
  ORDER BY subquery.similarity DESC
  LIMIT match_count;
END;
$$;

-- Add indices to improve query performance 
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

-- Fix any existing invalid embeddings (replace nulls or malformed with empty brackets)
UPDATE memory_embeddings 
SET embedding = '[]' 
WHERE embedding IS NULL OR embedding = '' OR embedding = '{}' OR embedding = 'null';
