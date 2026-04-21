-- AI Embeddings Migration
-- Run this in your Supabase SQL Editor to enable semantic search.
-- Requires pgvector extension (available on Supabase by default).

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create ai_embeddings table
CREATE TABLE IF NOT EXISTS ai_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  entity_type TEXT NOT NULL, -- 'meeting', 'task', 'contact', 'approval', 'insight', 'key_date'
  entity_id UUID NOT NULL,
  content TEXT NOT NULL, -- The text that was embedded
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entity_type, entity_id) -- One embedding per entity
);

-- 3. Create indexes for fast search
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_org ON ai_embeddings(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_entity ON ai_embeddings(entity_type, entity_id);

-- IVFFlat index for approximate nearest neighbor search (faster than exact for large datasets)
-- Adjust lists count based on your data size: sqrt(num_rows) is a good starting point
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_vector ON ai_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Create RPC function for upserting embeddings
CREATE OR REPLACE FUNCTION upsert_embedding(
  p_org_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_content TEXT,
  p_embedding vector(1536),
  p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_embeddings (org_id, entity_type, entity_id, content, embedding, metadata)
  VALUES (p_org_id, p_entity_type, p_entity_id, p_content, p_embedding, p_metadata)
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    content = p_content,
    embedding = p_embedding,
    metadata = p_metadata,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Create RPC function for similarity search
CREATE OR REPLACE FUNCTION search_embeddings(
  p_org_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.5,
  p_match_count INT DEFAULT 10,
  p_entity_types TEXT[] DEFAULT NULL
) RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.entity_type,
    e.entity_id,
    e.content,
    1 - (e.embedding <=> p_query_embedding) AS similarity,
    e.metadata
  FROM ai_embeddings e
  WHERE e.org_id = p_org_id
    AND (p_entity_types IS NULL OR e.entity_type = ANY(p_entity_types))
    AND 1 - (e.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Row Level Security
ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view embeddings in their org" ON ai_embeddings
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

-- Service role can do everything (for admin client)
CREATE POLICY "Service role full access" ON ai_embeddings
  FOR ALL USING (auth.role() = 'service_role');
