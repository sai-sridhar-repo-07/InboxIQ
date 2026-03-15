-- =============================================
-- pgvector similarity search function
-- =============================================
CREATE OR REPLACE FUNCTION match_reply_embeddings(
    query_embedding vector(1536),
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

-- =============================================
-- Auto-create user profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
