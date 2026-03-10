import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: themes, error } = await supabase
      .from('themes')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching themes:', error);
      return res.status(500).json({ error: 'Failed to fetch themes' });
    }

    return res.status(200).json({ themes });
  } catch (error: any) {
    console.error('Error in themes endpoint:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
