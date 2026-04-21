/**
 * Semantic Search Tool
 * AI tool for searching across meetings, tasks, contacts using vector similarity.
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';
import { searchSimilar } from '../embeddings';

const searchSimilarParams = z.object({
  query: z.string().min(1).describe('The search query — a question or topic to find related content for'),
  entityTypes: z.array(z.enum(['meeting', 'task', 'contact', 'approval', 'insight', 'key_date'])).optional()
    .describe('Optional: filter to specific entity types'),
  limit: z.number().min(1).max(20).default(5).describe('Maximum number of results'),
});

registerTool({
  name: 'search_similar',
  description: 'Search across meetings, tasks, contacts, and more using semantic similarity. Use this when the user asks about past events, people, or topics and you need to find related content across the system.',
  parameters: searchSimilarParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = searchSimilarParams.parse(params);
    const { orgId } = context;

    const results = await searchSimilar(orgId, validated.query, {
      entityTypes: validated.entityTypes,
      limit: validated.limit,
    });

    if (results.length === 0) {
      return {
        success: true,
        data: {
          results: [],
          message: 'No similar content found. The embeddings may not be populated yet.',
        },
      };
    }

    return {
      success: true,
      data: {
        results: results.map((r) => ({
          type: r.entityType,
          id: r.entityId,
          content: r.content.slice(0, 500), // Truncate for context window
          similarity: Math.round(r.similarity * 100) + '%',
          metadata: r.metadata,
        })),
        count: results.length,
      },
    };
  },
});

export { searchSimilarParams };
