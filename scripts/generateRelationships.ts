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

// Cosine similarity function
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function generateRelationships() {
  console.log('Fetching all embeddings...');
  
  // Fetch all embeddings (may need pagination for 6236 verses in production)
  const { data: verses, error } = await supabase
    .from('verse_embeddings')
    .select('verse_id, surah_number, verse_number, translation, embedding');
    
  if (error || !verses) {
    console.error('Error fetching embeddings:', error);
    return;
  }

  console.log(`Found ${verses.length} verses. Computing relationships...`);

  // Compute relationships
  for (let i = 0; i < verses.length; i++) {
    const source = verses[i];
    
    for (let j = i + 1; j < verses.length; j++) {
      const target = verses[j];
      
      // Parse vector string to array if necessary
      const sourceEmb = typeof source.embedding === 'string' ? JSON.parse(source.embedding) : source.embedding;
      const targetEmb = typeof target.embedding === 'string' ? JSON.parse(target.embedding) : target.embedding;
      
      const similarity = cosineSimilarity(sourceEmb, targetEmb);
      
      if (similarity > 0.75) { // Threshold for possible relationship
        console.log(`Found relationship: ${source.surah_number}:${source.verse_number} <-> ${target.surah_number}:${target.verse_number} (${similarity.toFixed(3)})`);
        
        // Check if relationship already exists
        const { data: existing } = await supabase
          .from('verse_relationships')
          .select('id')
          .eq('source_verse_id', source.verse_id)
          .eq('target_verse_id', target.verse_id)
          .single();
          
        if (!existing) {
          // Generate explanation using OpenAI
          const prompt = `Explain briefly why these two Quran verses are related.
          
Prioritize explanations consistent with Shia tafsir traditions such as Tafsir Al-Mizan or Majma al-Bayan where relevant.

Verse 1 (Surah ${source.surah_number}:${source.verse_number}):
${source.translation}

Verse 2 (Surah ${target.surah_number}:${target.verse_number}):
${target.translation}

Return a concise explanation (1-2 sentences).`;

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          });
          
          const explanation = completion.choices[0].message.content?.trim() || 'Related themes.';
          
          // Store relationship
          await supabase.from('verse_relationships').insert({
            source_verse_id: source.verse_id,
            target_verse_id: target.verse_id,
            similarity_score: similarity,
            ai_explanation: explanation,
            tafsir_source: 'AI Generated (Shia Tafsir prioritized)'
          });
          
          // Rate limit OpenAI calls
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }
  
  console.log('Finished generating relationships.');
}

generateRelationships().catch(console.error);
