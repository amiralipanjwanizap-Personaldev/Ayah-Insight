import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

export default async function handler(req: any, res: any) {
  try {
    const TOTAL_VERSES = 6236;

    // 1. Query Supabase to count the total rows in verse_insights
    const { count, error } = await supabase
      .from('verse_insights')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    const cached = count || 0;
    const remaining = TOTAL_VERSES - cached;
    const percentage = (cached / TOTAL_VERSES) * 100;

    // 3. Return response
    res.status(200).json({
      cached,
      total: TOTAL_VERSES,
      remaining,
      percentage
    });
  } catch (error) {
    console.error("Cache status error:", error);
    res.status(500).json({ error: "Failed to get cache status" });
  }
}
