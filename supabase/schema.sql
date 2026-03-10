-- Supabase Schema for Themes

CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add an index on name for faster lookups
CREATE INDEX IF NOT EXISTS themes_name_idx ON themes (name);
