import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbeddings() {
  console.log('Fetching all verses...');
  // Fetching verses from Al Quran Cloud API
  const res = await fetch('https://api.alquran.cloud/v1/quran/en.sahih');
  const data = await res.json();
  const surahs = data.data.surahs;

  let globalVerseId = 1;

  for (const surah of surahs) {
    for (const ayah of surah.ayahs) {
      console.log(`Processing Surah ${surah.number}, Ayah ${ayah.numberInSurah}...`);
      
      // Check if already exists to allow resuming
      const { data: existing } = await supabase
        .from('verse_embeddings')
        .select('verse_id')
        .eq('verse_id', globalVerseId)
        .single();

      if (!existing) {
        // Generate embedding
        const textToEmbed = `Surah ${surah.englishName} Verse ${ayah.numberInSurah}: ${ayah.text}`;
        
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: textToEmbed,
          dimensions: 3072,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Store in Supabase
        const { error } = await supabase.from('verse_embeddings').insert({
          verse_id: globalVerseId,
          surah_number: surah.number,
          verse_number: ayah.numberInSurah,
          text: ayah.text,
          translation: ayah.text,
          embedding,
        });

        if (error) {
          console.error(`Error inserting verse ${globalVerseId}:`, error);
        }
      }
      
      globalVerseId++;
      
      // Rate limiting protection
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('Finished generating embeddings.');
}

generateEmbeddings().catch(console.error);
