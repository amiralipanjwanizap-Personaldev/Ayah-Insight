import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

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

    // 3. Return JSON response using NextResponse.json()
    return NextResponse.json({
      query: query,
      results: verses?.map((v: any) => ({
        surah: v.surah_number,
        ayah: v.verse_number,
        text: v.text,
        translation: v.translation,
        similarity: v.similarity
      })) || []
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
