/**
 * AI Embeddings - Barrel Export
 */

export {
  storeEmbedding,
  searchSimilar,
  deleteEmbedding,
  batchEmbed,
} from './embedding-service';
export type { EmbeddingInput, SearchResult } from './embedding-service';
