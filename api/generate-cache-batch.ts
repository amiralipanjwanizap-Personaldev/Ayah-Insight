import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req: any, res: any) {
  try {
    const TOTAL_VERSES = 6236;
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 45000; // 45 seconds to prevent Vercel timeout

    // 1. Fetch Quran data
    const quranRes = await fetch("https://api.alquran.cloud/v1/quran/en.asad");
    const quranData = await quranRes.json();

    if (!quranData || !quranData.data || !quranData.data.surahs) {
      return res.status(500).json({ error: "Failed to fetch Quran data" });
    }

    // Flatten the Quran structure
    const allVerses: { surah_number: number; verse_number: number; translation: string; surah_name: string }[] = [];
    
    for (const surah of quranData.data.surahs) {
      for (const ayah of surah.ayahs) {
        allVerses.push({
          surah_number: surah.number,
          verse_number: ayah.numberInSurah,
          translation: ayah.text,
          surah_name: surah.englishName
        });
      }
    }

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

historical_context → max 120 words
modern_reflection → max 120 words
illustrative_story → max 150 words
ahlulbayt_hadith → max 80 words

Return valid JSON only.`;

    let processedCount = 0;
    let remaining = TOTAL_VERSES;

    // 1. When the endpoint is triggered, it should start a loop.
    while (true) {
      // 6. If the process stops early due to timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        return res.status(200).json({
          processed_in_this_run: processedCount,
          remaining: remaining
        });
      }

      // 2. Each loop iteration should:
      // • fetch missing verses from Supabase
      let existingVerses = new Set<string>();
      let hasMore = true;
      let offset = 0;
      const limit = 1000;

      while (hasMore) {
        const { data, error } = await supabase
          .from('verse_insights')
          .select('surah, verse')
          .range(offset, offset + limit - 1);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          for (const row of data) {
            existingVerses.add(`${row.surah}-${row.verse}`);
          }
          offset += limit;
          if (data.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      remaining = TOTAL_VERSES - existingVerses.size;

      // 4. Continue looping until the total cached verses reach: 6236
      if (existingVerses.size >= TOTAL_VERSES) {
        // 5. When caching completes, return:
        return res.status(200).json({
          message: "All Quran verses cached",
          total_cached: TOTAL_VERSES
        });
      }

      const missingVerses = allVerses.filter(v => !existingVerses.has(`${v.surah_number}-${v.verse_number}`));
      
      if (missingVerses.length === 0) {
        return res.status(200).json({
          message: "All Quran verses cached",
          total_cached: TOTAL_VERSES
        });
      }

      // • generate insights for a batch of 10 verses
      const batchSize = 10;
      const batch = missingVerses.slice(0, batchSize);

      for (const verse of batch) {
        try {
          const promptData = {
            verse_reference: `Surah ${verse.surah_number}, Verse ${verse.verse_number}`,
            surah_name: verse.surah_name,
            translation: verse.translation
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

          // • save them to the verse_insights table
          const { error: insertError } = await supabase
            .from('verse_insights')
            .insert([
              {
                surah: verse.surah_number,
                verse: verse.verse_number,
                historical_context: result.historical_context,
                modern_reflection: result.modern_reflection,
                illustrative_story: result.illustrative_story,
                ahlulbayt_hadith: result.ahlulbayt_hadith
              }
            ]);

          if (insertError) {
            console.error(`Supabase insert error for Surah ${verse.surah_number} Verse ${verse.verse_number}:`, insertError);
          } else {
            processedCount++;
            remaining--;
          }
        } catch (error) {
          console.error(`OpenAI or processing error for Surah ${verse.surah_number} Verse ${verse.verse_number}:`, error);
        }
      }

      // 3. After processing each batch, wait: 500ms before continuing.
      await delay(500);
    }

  } catch (error) {
    console.error("Batch generation error:", error);
    res.status(500).json({ error: "Failed to process batch" });
  }
}
