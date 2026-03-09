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
        illustrative_story: existingInsight.illustrative_story
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
          illustrative_story: result.illustrative_story
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
