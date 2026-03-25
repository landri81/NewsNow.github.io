const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.static(path.join(__dirname, "public")));

let cachedNews = null;
let lastFetch = 0;
const CACHE_MS = 4 * 60 * 1000;

app.get("/api/news", async (req, res) => {
  if (cachedNews && Date.now() - lastFetch < CACHE_MS) {
    return res.json({ articles: cachedNews, cached: true, fetchedAt: lastFetch });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurée sur le serveur." });
  }

  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Date: ${dateStr}, ${timeStr} (heure de France).

Fais plusieurs recherches web pour couvrir l'actualité mondiale du moment: géopolitique, économie/marchés, tech, société, environnement, sport.

Ensuite réponds UNIQUEMENT avec un tableau JSON brut. Pas de texte, pas de backticks. 8-12 objets triés par importance:

[{"title":"Titre accrocheur FR max 90 car","summary":"Résumé 1-2 phrases max 180 car","details":"Contexte enjeux max 250 car","priority":"critical|high|medium|low","category":"Géopolitique|Économie|Technologie|Environnement|Société|Sciences|Santé|Culture|Sport|Sécurité|Défense|Énergie","region":"zone","timestamp":"${now.toISOString()}"}]

critical=crise majeure, high=décision importante, medium=notable, low=tendance. UNIQUEMENT LE JSON.`
        }]
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`API ${response.status}: ${err.error?.message || "erreur"}`);
    }

    const data = await response.json();

    let allText = "";
    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text" && block.text) allText += "\n" + block.text;
      }
    }

    const articles = extractJSON(allText);
    if (articles && articles.length > 0) {
      const valid = articles.filter(a => a.title && a.summary).map(a => ({
        ...a,
        priority: ["critical","high","medium","low"].includes(a.priority) ? a.priority : "medium",
        timestamp: a.timestamp || now.toISOString(),
      }));
      cachedNews = valid;
      lastFetch = Date.now();
      return res.json({ articles: valid, cached: false, fetchedAt: lastFetch });
    }

    throw new Error("Impossible d'extraire les articles.");

  } catch (err) {
    console.error("Fetch error:", err.message);
    if (cachedNews) {
      return res.json({ articles: cachedNews, cached: true, fetchedAt: lastFetch, warning: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

function extractJSON(text) {
  if (!text) return null;
  const c = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try { const d = JSON.parse(c); return Array.isArray(d) ? d : d.news || d.articles || []; } catch {}
  const m = c.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
  if (m) { for (const chunk of m) { try { const arr = JSON.parse(chunk); if (arr.length > 0 && arr[0].title) return arr; } catch {} } }
  return null;
}

app.listen(PORT, () => {
  console.log(`✅ NewzNow running on http://localhost:${PORT}`);
  if (!API_KEY) console.warn("⚠️  ANTHROPIC_API_KEY is not set!");
});
