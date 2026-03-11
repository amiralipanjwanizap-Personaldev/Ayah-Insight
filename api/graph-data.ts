import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestedTheme = req.query.theme;
    let themeQuery = supabase.from('themes').select('id, name');
    
    if (requestedTheme) {
      themeQuery = themeQuery.ilike('name', requestedTheme);
    }

    // 3. Fetch themes
    const { data: themes, error: themesError } = await themeQuery;

    if (themesError) {
      console.error('Error fetching themes:', themesError);
      return res.status(500).json({ error: 'Failed to fetch themes' });
    }

    if (!themes || themes.length === 0) {
      return res.status(200).json({ nodes: [], links: [] });
    }

    const themeIds = themes.map(t => t.id);
    const themeMap = new Map(themes.map(t => [t.id, t.name]));

    // 4. Fetch verse mappings from verse_theme_map where theme_id exists in the selected themes
    const { data: mappings, error: mappingsError } = await supabase
      .from('verse_theme_map')
      .select('theme_id, surah, verse')
      .in('theme_id', themeIds)
      .limit(10000);

    if (mappingsError) {
      console.error('Error fetching mappings:', mappingsError);
      return res.status(500).json({ error: 'Failed to fetch mappings' });
    }

    // 5. Build nodes and links arrays
    const nodes = [];
    const links = [];
    const verseSet = new Set();

    // Add theme nodes
    for (const theme of themes) {
      nodes.push({
        id: theme.name,
        type: 'theme'
      });
    }

    // Add verse nodes and links
    if (mappings) {
      for (const mapping of mappings) {
        const themeName = themeMap.get(mapping.theme_id);
        const verseId = `${mapping.surah}:${mapping.verse}`;

        // Ensure verse nodes are unique
        if (!verseSet.has(verseId)) {
          verseSet.add(verseId);
          nodes.push({
            id: verseId,
            type: 'verse',
            surah: mapping.surah,
            verse: mapping.verse
          });
        }

        // Add link connecting theme to verse
        links.push({
          source: themeName,
          target: verseId
        });
      }
    }

    // 6. Return JSON
    return res.status(200).json({ nodes, links });

  } catch (error) {
    console.error('Error in graph-data handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
