import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize SQLite Database (Simulating Supabase for this environment)
const db = new Database("quran_cache.db");

// Create tables matching the requested schema
db.exec(`
  CREATE TABLE IF NOT EXISTS contexts (
    verse_id TEXT PRIMARY KEY,
    historical_context TEXT
  );
  CREATE TABLE IF NOT EXISTS reflections (
    verse_id TEXT PRIMARY KEY,
    modern_lesson TEXT
  );
  CREATE TABLE IF NOT EXISTS stories (
    verse_id TEXT PRIMARY KEY,
    story_text TEXT
  );
`);

// GET endpoint to check cache
app.get("/api/explanation/:surah/:verse", (req, res) => {
  const verse_id = `${req.params.surah}-${req.params.verse}`;
  
  try {
    const context = db.prepare("SELECT historical_context FROM contexts WHERE verse_id = ?").get(verse_id) as any;
    const reflection = db.prepare("SELECT modern_lesson FROM reflections WHERE verse_id = ?").get(verse_id) as any;
    const story = db.prepare("SELECT story_text FROM stories WHERE verse_id = ?").get(verse_id) as any;

    if (context && reflection && story) {
      res.json({
        historical_context: context.historical_context,
        modern_reflection: reflection.modern_lesson,
        illustrative_story: story.story_text
      });
    } else {
      res.status(404).json({ error: "Not found in cache" });
    }
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

// POST endpoint to save to cache
app.post("/api/explanation", (req, res) => {
  const { surah, verse, historical_context, modern_reflection, illustrative_story } = req.body;
  const verse_id = `${surah}-${verse}`;

  try {
    const insertContext = db.prepare("INSERT OR REPLACE INTO contexts (verse_id, historical_context) VALUES (?, ?)");
    const insertReflection = db.prepare("INSERT OR REPLACE INTO reflections (verse_id, modern_lesson) VALUES (?, ?)");
    const insertStory = db.prepare("INSERT OR REPLACE INTO stories (verse_id, story_text) VALUES (?, ?)");

    // Use a transaction to ensure all three tables are updated together
    const insertMany = db.transaction(() => {
      insertContext.run(verse_id, historical_context);
      insertReflection.run(verse_id, modern_reflection);
      insertStory.run(verse_id, illustrative_story);
    });
    
    insertMany();
    res.json({ success: true });
  } catch (error) {
    console.error("Save error:", error);
    res.status(500).json({ error: "Failed to save to database" });
  }
});

// POST endpoint to generate insight using OpenAI
app.post("/api/generate-insight", async (req, res) => {
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
    res.json(result);
  } catch (error) {
    console.error("OpenAI error:", error);
    res.status(500).json({ error: "Failed to generate insight" });
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
