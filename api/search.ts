import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // 1. Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
      dimensions: 3072,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Search Supabase using the pgvector function
    const { data: verses, error } = await supabase.rpc('search_verses', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, // Adjust threshold based on testing
      match_count: 10,
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({ results: verses });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
