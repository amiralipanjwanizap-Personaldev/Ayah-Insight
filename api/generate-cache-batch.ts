import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req: any, res: any) {
  try {
    // 1. Accept a query parameter: start
    const startParam = req.query?.start || req.body?.start || 1;
    const start = parseInt(startParam, 10);
    
    if (isNaN(start) || start < 1) {
      return res.status(400).json({ error: "Invalid start parameter" });
    }

    // 2. Process only the next batch of verses
    const batchSize = 100;
    const maxAyah = 6236; // Total verses in the Quran
    
    let processedCount = 0;
    let nextStart = start;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const systemInstruction = `You are an Islamic educational assistant specializing in Shia Islamic scholarship.

Your explanations should reflect the intellectual tradition of the Ahlul Bayt and align with respected Shia tafsir scholarship such as:

• Tafsir al-Mizan by Allama Tabatabai
• Tafsir al-Qummi
• Tafsir Nur al-Thaqalayn

Guidelines:

• Never generate or modify Quran text. The Quran text and translation are already provided externally.
• Maintain respectful scholarly language.
• Avoid sectarian criticism or polemical comparisons.
• Prefer interpretations cited in Shia scholarship when known.
• Focus on spiritual reflection and ethical guidance.

Generate the following JSON structure:

historical_context
modern_reflection
illustrative_story
ahlulbayt_hadith

The ahlulbayt_hadith field should provide a short teaching, saying, or wisdom attributed to the Imams of Ahlul Bayt that relates to the theme of the verse.

Word limits:

historical_context → max 200 words
modern_reflection → max 200 words
illustrative_story → max 200 words
ahlulbayt_hadith → max 200 words

Return valid JSON only.`;

    for (let i = 0; i < batchSize; i++) {
      const currentAyahId = start + i;
      
      if (currentAyahId > maxAyah) {
        break;
      }
      
      nextStart = currentAyahId + 1;

      try {
        // 3. Fetch only the required verse from the Quran API
        const quranRes = await fetch(`https://api.alquran.cloud/v1/ayah/${currentAyahId}/en.asad`);
        const quranData = await quranRes.json();

        if (!quranData || !quranData.data) {
          console.error(`Failed to fetch data for ayah ${currentAyahId}`);
          continue;
        }

        const ayahData = quranData.data;
        const surah_number = ayahData.surah.number;
        const verse_number = ayahData.numberInSurah;
        const translation = ayahData.text;
        const surah_name = ayahData.surah.englishName;

        // 4. Check Supabase for an existing record
        const { data: existingInsight, error: fetchError } = await supabase
          .from('verse_insights')
          .select('id')
          .eq('surah', surah_number)
          .eq('verse', verse_number)
          .single();

        // If it exists -> skip it
        if (existingInsight) {
          continue;
        }

        // If not -> generate insight using OpenAI
        const promptData = {
          verse_reference: `Surah ${surah_number}, Verse ${verse_number}`,
          surah_name: surah_name,
          translation: translation
        };

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: JSON.stringify(promptData) }
          ],
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");

        // 5. Save the generated insight into the verse_insights table
        const { error: insertError } = await supabase
          .from('verse_insights')
          .insert([
            {
              surah: surah_number,
              verse: verse_number,
              historical_context: result.historical_context,
              modern_reflection: result.modern_reflection,
              illustrative_story: result.illustrative_story,
              ahlulbayt_hadith: result.ahlulbayt_hadith
            }
          ]);

        if (insertError) {
          console.error(`Supabase insert error for Surah ${surah_number} Verse ${verse_number}:`, insertError);
        } else {
          processedCount++;
        }
      } catch (error) {
        console.error(`Error processing ayah ${currentAyahId}:`, error);
      }

      // Rate limit protection
      await delay(500);
    }

    // 6. Return response
    res.status(200).json({
      processed: processedCount,
      next_start: nextStart > maxAyah ? null : nextStart
    });

  } catch (error) {
    console.error("Batch generation error:", error);
    res.status(500).json({ error: "Failed to process batch" });
  }
}
