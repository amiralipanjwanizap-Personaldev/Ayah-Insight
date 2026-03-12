import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body || {};
    const query = body.query;

    // 1. Validate the query input
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'A valid search query is required.' });
    }

    const queryText = query.trim();

    // 2. Generate embedding using text-embedding-3-small
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: queryText,
      dimensions: 1536,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 3. Call supabase.rpc("search_maarifa")
    const { data: results, error } = await supabase.rpc('search_maarifa', {
      query_embedding: queryEmbedding,
      query_text: queryText,
      match_threshold: 0.6,
      match_count: 10,
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      return res.status(500).json({ error: 'Failed to search knowledge base.' });
    }

    // 4. Return the results
    return res.status(200).json({ results: results || [] });

  } catch (error) {
    console.error('Maarifa search error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
