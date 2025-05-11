
-- Create function to match memories based on embedding similarity
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
