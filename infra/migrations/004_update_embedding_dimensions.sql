-- =============================================
-- Migration 004: Update embedding dimensions
-- sentence-transformers all-MiniLM-L6-v2 → 384 dims (was 1536 for OpenAI)
-- Run this migration BEFORE inserting any embeddings.
-- If you already have data in reply_embeddings, truncate first:
--   TRUNCATE TABLE reply_embeddings;
-- =============================================

-- Drop the old index (if it exists) before altering the column
DROP INDEX IF EXISTS idx_reply_embeddings_user_id;

-- Alter the vector column to 384 dimensions
ALTER TABLE reply_embeddings
    ALTER COLUMN embedding TYPE vector(384);

-- Recreate the user_id index
CREATE INDEX idx_reply_embeddings_user_id ON reply_embeddings(user_id);

-- Update the pgvector similarity search function to match new dimensions
CREATE OR REPLACE FUNCTION match_reply_embeddings(
    query_embedding vector(384),
    match_user_id UUID,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    reply_text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        re.id,
        re.reply_text,
        1 - (re.embedding <=> query_embedding) AS similarity
    FROM reply_embeddings re
    WHERE re.user_id = match_user_id
    ORDER BY re.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
