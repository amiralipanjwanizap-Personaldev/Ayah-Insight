import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const openaiKey = process.env.OPENAI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Fetch all themes from Supabase table: themes
    const { data: themes, error: themesError } = await supabase
      .from('themes')
      .select('id, name, description');

    if (themesError || !themes || themes.length === 0) {
      return res.status(400).json({ error: 'No themes found. Please generate themes first.' });
    }

    const themeNamesList = themes.map(t => `- ${t.name}: ${t.description}`).join('\n');

    // 1. Fetch 10 records from verse_insights that do NOT already exist in verse_theme_map
    // First, fetch mapped verses to know what to exclude
    const { data: mappedVerses, error: mappedError } = await supabase
      .from('verse_theme_map')
      .select('surah, verse');

    const mappedSet = new Set(mappedVerses?.map(v => `${v.surah}-${v.verse}`) || []);

    let unmappedInsights: any[] = [];
    let offset = 0;
    const limit = 100;

    // Fetch in batches until we have 10 unmapped insights
    while (unmappedInsights.length < 10) {
      const { data: insights, error: insightsError } = await supabase
        .from('verse_insights')
        .select('surah, verse, historical_context, modern_reflection, illustrative_story, ahlulbayt_hadith')
        .range(offset, offset + limit - 1);

      if (insightsError || !insights || insights.length === 0) {
        break;
      }

      const newUnmapped = insights.filter(i => !mappedSet.has(`${i.surah}-${i.verse}`));
      unmappedInsights.push(...newUnmapped);
      offset += limit;
    }

    // 6. Process 10 verses per request
    unmappedInsights = unmappedInsights.slice(0, 10);

    if (unmappedInsights.length === 0) {
      return res.status(200).json({ processed: 0 });
    }

    let processedCount = 0;

    // 3. Send the verse insight text and theme list to OpenAI
    for (const insight of unmappedInsights) {
      const insightText = `
Historical Context: ${insight.historical_context || 'N/A'}
Modern Reflection: ${insight.modern_reflection || 'N/A'}
Illustrative Story: ${insight.illustrative_story || 'N/A'}
Ahlulbayt Hadith: ${insight.ahlulbayt_hadith || 'N/A'}
      `.trim();

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `For the following Quran verse insight, determine which theme best fits it from the provided theme list.

Return only JSON:

{
"theme": "theme_name"
}

Theme List:
${themeNamesList}

Verse Insight:
${insightText}`
            }
          ],
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0].message.content;
        if (!content) continue;

        const parsed = JSON.parse(content);
        const returnedThemeName = parsed.theme;

        // 4. Match the returned theme name to the correct theme_id
        const matchedTheme = themes.find(t => t.name.toLowerCase() === returnedThemeName?.toLowerCase());

        if (matchedTheme) {
          // 5. Insert a row into Supabase: verse_theme_map
          const { error: insertError } = await supabase
            .from('verse_theme_map')
            .insert({
              theme_id: matchedTheme.id,
              surah: insight.surah,
              verse: insight.verse
            });

          if (!insertError) {
            processedCount++;
          } else {
            console.error(`Error inserting mapping for Surah ${insight.surah} Verse ${insight.verse}:`, insertError);
          }
        } else {
          console.warn(`Theme "${returnedThemeName}" not found in database for Surah ${insight.surah} Verse ${insight.verse}`);
        }
      } catch (err) {
        console.error(`Error processing Surah ${insight.surah} Verse ${insight.verse}:`, err);
      }
    }

    // 7. Return response
    return res.status(200).json({ processed: processedCount });

  } catch (error: any) {
    console.error('Error in assign-themes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
