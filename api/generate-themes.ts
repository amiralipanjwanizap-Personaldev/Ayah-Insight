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
    // 1. Fetch up to 100 records from verse_insights
    const { data: insights, error: fetchError } = await supabase
      .from('verse_insights')
      .select('historical_context, modern_reflection, illustrative_story, ahlulbayt_hadith')
      .limit(100);

    if (fetchError) {
      console.error('Error fetching insights:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch insights' });
    }

    if (!insights || insights.length === 0) {
      return res.status(400).json({ error: 'No insights found to generate themes' });
    }

    // Prepare content for OpenAI
    const insightsText = insights.map((insight, index) => `
Insight ${index + 1}:
Historical Context: ${insight.historical_context || 'N/A'}
Modern Reflection: ${insight.modern_reflection || 'N/A'}
Illustrative Story: ${insight.illustrative_story || 'N/A'}
Ahlulbayt Hadith: ${insight.ahlulbayt_hadith || 'N/A'}
`).join('\n---\n');

    // 2. Send content to OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or gpt-4o, depending on preference
      messages: [
        {
          role: 'system',
          content: 'You are an expert in Quranic studies and thematic analysis.'
        },
        {
          role: 'user',
          content: `Analyze the following Quran verse insights and extract the most common recurring themes across them.

Return 15–25 high-level themes that represent core concepts in the Quran.

Examples of possible themes:
Patience
Justice
Faith
Trials
Gratitude
Charity
Leadership
Oppression
Guidance
Repentance

Each theme must include:
• name
• short description

Return JSON only. Format it as an array of objects with "name" and "description" keys.

Insights:
${insightsText}`
        }
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    // Extract the array of themes (handling potential wrapper objects)
    let themesToInsert = [];
    if (Array.isArray(parsedContent)) {
      themesToInsert = parsedContent;
    } else if (parsedContent.themes && Array.isArray(parsedContent.themes)) {
      themesToInsert = parsedContent.themes;
    } else {
      // Try to find any array in the object
      const arrayKey = Object.keys(parsedContent).find(key => Array.isArray(parsedContent[key]));
      if (arrayKey) {
        themesToInsert = parsedContent[arrayKey];
      } else {
        throw new Error('Could not find themes array in OpenAI response');
      }
    }

    // 3. Insert returned themes into Supabase, avoiding duplicates
    const results = {
      inserted: 0,
      duplicates: 0,
      errors: 0,
      themes: [] as any[]
    };

    for (const theme of themesToInsert) {
      if (!theme.name || !theme.description) continue;

      // Check if theme already exists
      const { data: existing } = await supabase
        .from('themes')
        .select('id')
        .ilike('name', theme.name)
        .single();

      if (existing) {
        results.duplicates++;
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('themes')
        .insert({
          name: theme.name,
          description: theme.description
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error inserting theme ${theme.name}:`, insertError);
        results.errors++;
      } else if (inserted) {
        results.inserted++;
        results.themes.push(inserted);
      }
    }

    return res.status(200).json({
      message: 'Theme generation complete',
      results
    });

  } catch (error: any) {
    console.error('Error in generate-themes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
