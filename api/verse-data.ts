import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getOrCreateEmbedding(global_verse_id: number, surah: number, verse: number, text: string, translation: string) {
  let { data: verseData } = await supabase
    .from('verse_embeddings')
    .select('*')
    .eq('verse_id', global_verse_id)
    .single();

  if (verseData && verseData.embedding) {
    return verseData;
  }

  console.log(`Generating embedding for Surah ${surah}:${verse}`);
  const textToEmbed = `Surah ${surah} Verse ${verse}: ${text}`;
  
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: textToEmbed,
    dimensions: 3072,
  });

  const embedding = embeddingResponse.data[0].embedding;

  const { data: upsertedData, error: upsertError } = await supabase
    .from('verse_embeddings')
    .upsert({
      verse_id: global_verse_id,
      surah_number: surah,
      verse_number: verse,
      text: text,
      translation: translation,
      embedding: embedding,
      relationships_processed: false
    }, { onConflict: 'verse_id' })
    .select()
    .single();

  if (upsertError) throw upsertError;
  return upsertedData;
}

async function getOrCreateRelationships(verseData: any) {
  if (verseData.relationships_processed) {
    return;
  }

  console.log(`Generating relationships for Surah ${verseData.surah_number}:${verseData.verse_number}`);
  
  const { data: similarVerses, error: searchError } = await supabase.rpc('search_verses', {
    query_embedding: verseData.embedding,
    match_threshold: 0.75,
    match_count: 6 // Limit to top 5 related verses (+1 for itself)
  });

  if (searchError) throw searchError;

  const relationshipsToInsert = [];

  for (const match of similarVerses || []) {
    if (match.verse_id === verseData.verse_id) continue;

    const prompt = `Explain briefly why these two Quran verses are related.
    
Prioritize explanations consistent with Shia tafsir traditions such as Tafsir Al-Mizan, Majma al-Bayan, or al-Tibyan where relevant. If tafsir differences are not relevant, provide a neutral explanation.

Verse 1 (Surah ${verseData.surah_number}:${verseData.verse_number}):
${verseData.translation}

Verse 2 (Surah ${match.surah_number}:${match.verse_number}):
${match.translation}

Return a concise explanation (1-2 sentences).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const explanation = completion.choices[0].message.content?.trim() || 'Related themes.';

    relationshipsToInsert.push({
      source_verse_id: verseData.verse_id,
      target_verse_id: match.verse_id,
      similarity_score: match.similarity,
      ai_explanation: explanation,
      tafsir_source: 'AI Generated (Shia Tafsir prioritized)'
    });
  }

  if (relationshipsToInsert.length > 0) {
    await supabase
      .from('verse_relationships')
      .upsert(relationshipsToInsert, { onConflict: 'source_verse_id,target_verse_id', ignoreDuplicates: true });
  }

  await supabase
    .from('verse_embeddings')
    .update({ relationships_processed: true })
    .eq('verse_id', verseData.verse_id);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { surah, verse, text, translation, global_verse_id } = req.body;

  if (!surah || !verse || !text || !translation || !global_verse_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Get or create embedding
    const verseData = await getOrCreateEmbedding(global_verse_id, surah, verse, text, translation);

    // 2. Get or create relationships
    await getOrCreateRelationships(verseData);

    // 3. Fetch and return all relationships for this verse
    const { data: relationships, error: relError } = await supabase
      .from('verse_relationships')
      .select(`
        similarity_score,
        ai_explanation,
        target_verse:verse_embeddings!target_verse_id (
          verse_id,
          surah_number,
          verse_number,
          text,
          translation
        )
      `)
      .eq('source_verse_id', global_verse_id)
      .order('similarity_score', { ascending: false });

    if (relError) throw relError;

    return res.status(200).json({
      verse: {
        surah,
        verse,
        text,
        translation
      },
      relationships: relationships?.map(r => ({
        target_verse_id: (r.target_verse as any).verse_id,
        target_surah: (r.target_verse as any).surah_number,
        target_verse: (r.target_verse as any).verse_number,
        target_text: (r.target_verse as any).text,
        target_translation: (r.target_verse as any).translation,
        similarity_score: r.similarity_score,
        ai_explanation: r.ai_explanation
      })) || []
    });

  } catch (error) {
    console.error("Error in verse-data:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
