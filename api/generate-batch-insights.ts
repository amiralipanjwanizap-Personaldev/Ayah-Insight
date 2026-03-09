import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req: any, res: any) {
  // Allow GET or POST for easy triggering
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Fetch Quran data
    const quranResponse = await fetch("https://api.alquran.cloud/v1/quran/en.asad");
    const quranData = await quranResponse.json();
    const surahs = quranData.data.surahs;

    // Flatten all verses into a single array
    const allVerses: { surah: number, verse: number, translation: string, surah_name: string }[] = [];
    for (const surah of surahs) {
      for (const ayah of surah.ayahs) {
        allVerses.push({
          surah: surah.number,
          verse: ayah.numberInSurah,
          translation: ayah.text,
          surah_name: surah.englishName
        });
      }
    }

    // 2. Determine which verses are already cached in Supabase
    const { data: existingInsights, error: fetchError } = await supabase
      .from('verse_insights')
      .select('surah, verse');

    if (fetchError) {
      throw fetchError;
    }

    const existingSet = new Set(existingInsights.map((i: any) => `${i.surah}-${i.verse}`));

    // 3. Identify the next batch of verses that are missing
    const missingVerses = allVerses.filter(v => !existingSet.has(`${v.surah}-${v.verse}`));

    const BATCH_SIZE = 10;
    const batch = missingVerses.slice(0, BATCH_SIZE);

    if (batch.length === 0) {
      return res.status(200).json({ processed: 0, remaining: 0 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const systemInstruction = `You are an Islamic education assistant providing historically grounded explanations of Quranic verses.

Important rule:
Never generate or modify Quran text.
The Quran text and translation are already provided by the database.

Generate three sections.
historical_context: Explain the historical background of the verse if known.
modern_reflection: Explain how the verse applies to life today.
illustrative_story: Write a short relatable story illustrating the lesson.

Rules:
• respectful tone
• neutral academic style
• avoid sectarian bias
• avoid political commentary

Length limits:
historical_context → max 120 words
modern_reflection → max 120 words
illustrative_story → max 150 words

Return JSON only.`;

    let processedCount = 0;

    // 4. For each verse in the batch
    for (const verseData of batch) {
      const promptData = {
        verse_reference: `Surah ${verseData.surah}, Verse ${verseData.verse}`,
        surah_name: verseData.surah_name,
        translation: verseData.translation
      };

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: JSON.stringify(promptData) }
          ],
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");

        // 5. Save each generated insight into Supabase
        const { error: insertError } = await supabase
          .from('verse_insights')
          .insert([
            {
              surah: verseData.surah,
              verse: verseData.verse,
              historical_context: result.historical_context,
              modern_reflection: result.modern_reflection,
              illustrative_story: result.illustrative_story
            }
          ]);

        if (insertError) {
          console.error("Supabase insert error:", insertError);
        } else {
          processedCount++;
        }
      } catch (err) {
        console.error(`Error processing Surah ${verseData.surah} Verse ${verseData.verse}:`, err);
      }

      // 7. Add a small delay between OpenAI calls (500ms) to avoid rate limits
      await delay(500);
    }

    // 6. Return response
    const remaining = missingVerses.length - processedCount;

    res.status(200).json({
      processed: processedCount,
      remaining: remaining
    });

  } catch (error) {
    console.error("Batch generation error:", error);
    res.status(500).json({ error: "Failed to process batch" });
  }
}
