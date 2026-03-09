import OpenAI from "openai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { surah, verse, translation, surah_name } = req.body;

  try {
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
    res.status(200).json(result);
  } catch (error) {
    console.error("OpenAI error:", error);
    res.status(500).json({ error: "Failed to generate insight" });
  }
}
