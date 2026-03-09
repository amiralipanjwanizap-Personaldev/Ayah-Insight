-- Enable pgvector extension
create extension if not exists vector;

-- Table for verse embeddings
create table if not exists verse_embeddings (
  verse_id integer primary key, -- e.g., global verse number (1 to 6236)
  surah_number integer not null,
  verse_number integer not null,
  text text not null,
  translation text not null,
  embedding vector(3072), -- text-embedding-3-large uses 3072 dimensions by default
  relationships_processed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast vector search (cosine similarity)
create index if not exists idx_verse_embeddings_vector on verse_embeddings using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Table for verse relationships
create table if not exists verse_relationships (
  id uuid primary key default gen_random_uuid(),
  source_verse_id integer references verse_embeddings(verse_id) on delete cascade,
  target_verse_id integer references verse_embeddings(verse_id) on delete cascade,
  similarity_score float not null,
  ai_explanation text not null,
  tafsir_source text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(source_verse_id, target_verse_id)
);

-- Index for querying relationships
create index if not exists idx_verse_relationships_source on verse_relationships(source_verse_id);
create index if not exists idx_verse_relationships_target on verse_relationships(target_verse_id);

-- Function for semantic search
create or replace function search_verses(
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  verse_id integer,
  surah_number integer,
  verse_number integer,
  text text,
  translation text,
  similarity float
)
language sql stable
as $$
  select
    verse_embeddings.verse_id,
    verse_embeddings.surah_number,
    verse_embeddings.verse_number,
    verse_embeddings.text,
    verse_embeddings.translation,
    1 - (verse_embeddings.embedding <=> query_embedding) as similarity
  from verse_embeddings
  where 1 - (verse_embeddings.embedding <=> query_embedding) > match_threshold
  order by verse_embeddings.embedding <=> query_embedding
  limit match_count;
$$;
