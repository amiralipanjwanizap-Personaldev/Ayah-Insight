import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { surah, verse, translation, surah_name } = req.body;

  try {
    // Step 1: Check Supabase for an existing insight
    const { data: existingInsight, error: fetchError } = await supabase
      .from('verse_insights')
      .select('*')
      .eq('surah', surah)
      .eq('verse', verse)
      .single();

    // Step 2: If a record exists, return it immediately
    if (existingInsight) {
      return res.status(200).json({
        historical_context: existingInsight.historical_context,
        modern_reflection: existingInsight.modern_reflection,
        illustrative_story: existingInsight.illustrative_story,
        ahlulbayt_hadith: existingInsight.ahlulbayt_hadith
      });
    }

    // Step 3: If not, generate the insight using the OpenAI API
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const promptData = {
      verse_reference: `Surah ${surah}, Verse ${verse}`,
      surah_name: surah_name,
      translation: translation
    };

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: JSON.stringify(promptData) }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    // Step 4: Insert the generated insight into Supabase
    const { error: insertError } = await supabase
      .from('verse_insights')
      .insert([
        {
          surah,
          verse,
          historical_context: result.historical_context,
          modern_reflection: result.modern_reflection,
          illustrative_story: result.illustrative_story,
          ahlulbayt_hadith: result.ahlulbayt_hadith
        }
      ]);
      
    if (insertError) {
      console.error("Supabase insert error:", insertError);
    }

    // Step 5: Return the insight JSON to the frontend
    res.status(200).json(result);
  } catch (error) {
    console.error("Error generating insight:", error);
    res.status(500).json({ error: "Failed to generate insight" });
  }
}
