import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// GET /api/search endpoint for semantic search
app.get("/api/search", async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    // Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
      dimensions: 3072,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search Supabase using the pgvector function
    const { data: verses, error } = await supabase.rpc('search_verses', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, // Adjust threshold based on testing
      match_count: 10,
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      query: query,
      results: verses?.map((v: any) => ({
        surah: v.surah_number,
        ayah: v.verse_number,
        text: v.text,
        translation: v.translation,
        similarity: v.similarity
      })) || []
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
