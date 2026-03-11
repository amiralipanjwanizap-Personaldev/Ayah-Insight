import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

export default async function handler(req: any, res: any) {
  const { surah, verse } = req.query;
  if (!surah || !verse) return res.status(400).json({ error: 'Missing parameters' });

  const { data, error } = await supabase
    .from('verse_theme_map')
    .select('themes(name)')
    .eq('surah', parseInt(surah as string))
    .eq('verse', parseInt(verse as string));

  if (error) return res.status(500).json({ error: error.message });

  const themes = data.map((item: any) => item.themes.name);
  res.status(200).json({ themes });
}
