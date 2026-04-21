/**
 * Embedding Service
 * Generates, stores, and searches vector embeddings using OpenAI text-embedding-3-small
 * and Supabase pgvector for semantic similarity search.
 *
 * PREREQUISITE: Run the migration in embeddings/migration.sql to create the
 * ai_embeddings table with pgvector support in your Supabase project.
 */

import { createAdminClient } from '@jeniferai/core-database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingInput {
  orgId: string;
  entityType: 'meeting' | 'task' | 'contact' | 'approval' | 'insight' | 'key_date';
  entityId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  entityType: string;
  entityId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown> | null;
}

/**
 * Generate an embedding vector from text using OpenAI API.
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[Embeddings] OPENAI_API_KEY not set, skipping embedding generation');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000), // Limit input to avoid token limits
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Embeddings] OpenAI API error:', error);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (err) {
    console.error('[Embeddings] Failed to generate embedding:', err);
    return null;
  }
}

/**
 * Store an embedding for an entity. Upserts (replaces if same entity exists).
 */
export async function storeEmbedding(input: EmbeddingInput): Promise<boolean> {
  const embedding = await generateEmbedding(input.content);
  if (!embedding) return false;

  const supabase: AnySupabase = createAdminClient();

  try {
    // Use RPC to call the upsert function (handles vector type properly)
    const { error } = await supabase.rpc('upsert_embedding', {
      p_org_id: input.orgId,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId,
      p_content: input.content.slice(0, 10000),
      p_embedding: embedding,
      p_metadata: input.metadata || {},
    });

    if (error) {
      // Table might not exist yet — log but don't crash
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('[Embeddings] ai_embeddings table not found. Run the migration first.');
        return false;
      }
      console.error('[Embeddings] Failed to store embedding:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Embeddings] Store embedding error:', err);
    return false;
  }
}

/**
 * Search for similar content using vector similarity.
 */
export async function searchSimilar(
  orgId: string,
  query: string,
  options: {
    entityTypes?: string[];
    limit?: number;
    threshold?: number;
  } = {}
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  const supabase: AnySupabase = createAdminClient();
  const limit = options.limit || 10;
  const threshold = options.threshold || 0.5;

  try {
    // Use RPC to perform the similarity search (SQL with pgvector operators)
    const { data, error } = await supabase.rpc('search_embeddings', {
      p_org_id: orgId,
      p_query_embedding: embedding,
      p_match_threshold: threshold,
      p_match_count: limit,
      p_entity_types: options.entityTypes || null,
    });

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('[Embeddings] ai_embeddings table not found. Run the migration first.');
        return [];
      }
      console.error('[Embeddings] Search failed:', error.message);
      return [];
    }

    return (data || []).map((row: {
      entity_type: string;
      entity_id: string;
      content: string;
      similarity: number;
      metadata: Record<string, unknown> | null;
    }) => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      content: row.content,
      similarity: row.similarity,
      metadata: row.metadata,
    }));
  } catch (err) {
    console.error('[Embeddings] Search error:', err);
    return [];
  }
}

/**
 * Delete embeddings for a specific entity (e.g., when entity is deleted).
 */
export async function deleteEmbedding(entityType: string, entityId: string): Promise<void> {
  const supabase: AnySupabase = createAdminClient();

  try {
    await supabase
      .from('ai_embeddings')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);
  } catch {
    // Silently fail if table doesn't exist
  }
}

/**
 * Batch-embed all entities of a given type for an organization.
 * Useful for initial population of the embeddings table.
 */
export async function batchEmbed(
  orgId: string,
  entityType: 'meeting' | 'task' | 'contact',
  limit = 100
): Promise<{ processed: number; embedded: number }> {
  const supabase: AnySupabase = createAdminClient();
  let processed = 0;
  let embedded = 0;

  if (entityType === 'meeting') {
    const { data: meetings } = await supabase
      .from('meetings')
      .select('id, title, description, attendees, meeting_type, location')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    for (const m of (meetings || []) as Array<{
      id: string;
      title: string;
      description: string | null;
      attendees: unknown;
      meeting_type: string | null;
      location: string | null;
    }>) {
      processed++;
      const content = [
        m.title,
        m.description,
        m.meeting_type ? `Type: ${m.meeting_type}` : '',
        m.location ? `Location: ${m.location}` : '',
        m.attendees ? `Attendees: ${JSON.stringify(m.attendees)}` : '',
      ].filter(Boolean).join('\n');

      const ok = await storeEmbedding({ orgId, entityType: 'meeting', entityId: m.id, content });
      if (ok) embedded++;
    }
  } else if (entityType === 'task') {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, category, tags')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    for (const t of (tasks || []) as Array<{
      id: string;
      title: string;
      description: string | null;
      category: string | null;
      tags: unknown;
    }>) {
      processed++;
      const content = [
        t.title,
        t.description,
        t.category ? `Category: ${t.category}` : '',
        t.tags ? `Tags: ${JSON.stringify(t.tags)}` : '',
      ].filter(Boolean).join('\n');

      const ok = await storeEmbedding({ orgId, entityType: 'task', entityId: t.id, content });
      if (ok) embedded++;
    }
  } else if (entityType === 'contact') {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, email, company, title, relationship_type, notes')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    for (const c of (contacts || []) as Array<{
      id: string;
      full_name: string;
      email: string | null;
      company: string | null;
      title: string | null;
      relationship_type: string | null;
      notes: string | null;
    }>) {
      processed++;
      const content = [
        c.full_name,
        c.title ? `Title: ${c.title}` : '',
        c.company ? `Company: ${c.company}` : '',
        c.relationship_type ? `Relationship: ${c.relationship_type}` : '',
        c.notes,
      ].filter(Boolean).join('\n');

      const ok = await storeEmbedding({ orgId, entityType: 'contact', entityId: c.id, content });
      if (ok) embedded++;
    }
  }

  return { processed, embedded };
}
