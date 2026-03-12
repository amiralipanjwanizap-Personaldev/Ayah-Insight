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

// Mock dataset for Tafsir al-Mizan
const mockTafsirData = [
  {
    surah: 2,
    verse: 177,
    text_en: "Righteousness is not that you turn your faces toward the east or the west, but true righteousness is in one who believes in Allah, the Last Day, the angels, the Book, and the prophets...",
    text_ar: null
  },
  {
    surah: 1,
    verse: 1,
    text_en: "In the name of Allah, the Entirely Merciful, the Especially Merciful. This verse establishes that every action should begin with the name of Allah to seek His blessing.",
    text_ar: null
  },
  {
    surah: 1,
    verse: 2,
    text_en: "[All] praise is [due] to Allah, Lord of the worlds. The word 'Alhamdulillah' encompasses all forms of praise and gratitude, exclusively belonging to the Creator.",
    text_ar: null
  }
];

export default async function handler(req: any, res: any) {
  // Only allow POST and GET requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const SOURCE_ID = '094b6760-ec4f-420e-9797-825fa8c74f79';

    // 9. Limit processing to 100 rows maximum per request
    const batch = mockTafsirData.slice(0, 100);

    if (batch.length === 0) {
      return res.status(200).json({ inserted: 0 });
    }

    // Extract texts for batch embedding
    const textsToEmbed = batch.map(item => item.text_en);

    // 7. Generate embeddings in batch using one OpenAI request
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textsToEmbed,
      dimensions: 1536,
    });

    const embeddings = embeddingResponse.data;

    // Prepare payload for Supabase
    const payload = batch.map((item, index) => ({
      source_id: SOURCE_ID,
      surah: item.surah,
      verse: item.verse,
      text_en: item.text_en,
      text_ar: item.text_ar,
      embedding: embeddings[index].embedding,
    }));

    // 8. Insert rows into Supabase
    const { error } = await supabase
      .from('tafsir')
      .insert(payload);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to insert tafsir data into database.' });
    }

    // 10. Return JSON response
    return res.status(200).json({ inserted: payload.length });

  } catch (error) {
    // 11. Proper try/catch error handling
    console.error('Tafsir ingestion error:', error);
    return res.status(500).json({ error: 'Internal server error during ingestion.' });
  }
}
