const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.static(path.join(__dirname, "public")));

// ── 24h History store per feed ──
const HISTORY_MS = 24 * 60 * 60 * 1000;
const CACHE_MS = 9 * 60 * 1000;

const feeds = {
  mondial: { history: [], lastFetch: 0, cache: null },
  finance: { history: [], lastFetch: 0, cache: null },
  france:  { history: [], lastFetch: 0, cache: null },
};

function cleanHistory(feed) {
  const cutoff = Date.now() - HISTORY_MS;
  feed.history = feed.history.filter(a => new Date(a.timestamp).getTime() > cutoff);
}

function addToHistory(feed, articles) {
  const existingTitles = new Set(feed.history.map(a => a.title));
  for (const a of articles) {
    if (!existingTitles.has(a.title)) {
      feed.history.push(a);
      existingTitles.add(a.title);
    }
  }
  cleanHistory(feed);
}

// ── Prompts per feed ──
const prompts = {
  mondial: (dateStr, timeStr, iso) => `Date: ${dateStr}, ${timeStr} (heure de France).

Fais plusieurs recherches web pour couvrir l'actualité mondiale du moment: géopolitique, économie/marchés, tech, société, environnement, sport.

Réponds UNIQUEMENT avec un tableau JSON brut. Pas de texte, pas de backticks. 8-12 objets triés par importance:

[{"title":"Titre accrocheur FR max 90 car","summary":"Résumé 1-2 phrases max 180 car","details":"Contexte enjeux max 250 car","priority":"critical|high|medium|low","category":"Géopolitique|Économie|Technologie|Environnement|Société|Sciences|Santé|Culture|Sport|Sécurité|Défense|Énergie","region":"zone","timestamp":"${iso}"}]

critical=crise majeure, high=décision importante, medium=notable, low=tendance. UNIQUEMENT LE JSON.`,

  finance: (dateStr, timeStr, iso) => `Date: ${dateStr}, ${timeStr} (heure de France).

Fais plusieurs recherches web sur l'actualité FINANCE et BOURSE du moment: marchés boursiers (CAC40, S&P500, Nasdaq, Nikkei), crypto, devises, matières premières, fusions-acquisitions, résultats d'entreprises, politique monétaire (BCE, Fed), immobilier.

Réponds UNIQUEMENT avec un tableau JSON brut. Pas de texte, pas de backticks. 8-12 objets triés par importance:

[{"title":"Titre accrocheur FR max 90 car","summary":"Résumé 1-2 phrases max 180 car","details":"Contexte enjeux max 250 car","priority":"critical|high|medium|low","category":"Bourse|Crypto|Devises|Matières premières|Entreprises|Banques centrales|Immobilier|Investissement|FinTech|Fiscalité","region":"zone","timestamp":"${iso}"}]

critical=krach/crise financière, high=mouvement majeur de marché, medium=notable, low=tendance. UNIQUEMENT LE JSON.`,

  france: (dateStr, timeStr, iso) => `Date: ${dateStr}, ${timeStr} (heure de France).

Fais plusieurs recherches web sur l'actualité FRANÇAISE du moment: politique intérieure, économie française, société, faits divers, culture, sport français, éducation, santé, régions.

Réponds UNIQUEMENT avec un tableau JSON brut. Pas de texte, pas de backticks. 8-12 objets triés par importance:

[{"title":"Titre accrocheur FR max 90 car","summary":"Résumé 1-2 phrases max 180 car","details":"Contexte enjeux max 250 car","priority":"critical|high|medium|low","category":"Politique|Économie|Société|Justice|Culture|Sport|Santé|Éducation|Régions|Environnement|Tech|Sécurité","region":"zone en France","timestamp":"${iso}"}]

critical=crise nationale, high=décision politique majeure, medium=notable, low=tendance. UNIQUEMENT LE JSON.`,
};

// ── Generic fetch for any feed ──
async function fetchFeed(feedName) {
  const feed = feeds[feedName];
  if (!feed) return null;

  if (feed.cache && Date.now() - feed.lastFetch < CACHE_MS) {
    return { articles: feed.history, cached: true, fetchedAt: feed.lastFetch };
  }

  if (!API_KEY) throw new Error("ANTHROPIC_API_KEY non configurée.");

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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompts[feedName](dateStr, timeStr, now.toISOString()) }]
    }),
  });

  if (response.status === 429) {
    if (feed.history.length) return { articles: feed.history, cached: true, fetchedAt: feed.lastFetch };
    throw new Error("Trop de requêtes. Réessayez dans 1 minute.");
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API ${response.status}: ${err.error?.message || "erreur"}`);
  }

  const data = await response.json();
  let allText = "";
  if (data.content) for (const b of data.content) if (b.type === "text" && b.text) allText += "\n" + b.text;

  const articles = extractJSON(allText);
  if (articles && articles.length > 0) {
    const valid = articles.filter(a => a.title && a.summary).map(a => ({
      ...a,
      priority: ["critical","high","medium","low"].includes(a.priority) ? a.priority : "medium",
      timestamp: a.timestamp || now.toISOString(),
    }));
    addToHistory(feed, valid);
    feed.cache = valid;
    feed.lastFetch = Date.now();
    return { articles: feed.history, latest: valid, cached: false, fetchedAt: feed.lastFetch };
  }

  throw new Error("Impossible d'extraire les articles.");
}

// ── API Routes ──
app.get("/api/news", async (req, res) => {
  try {
    const result = await fetchFeed("mondial");
    res.json(result);
  } catch (err) {
    console.error("mondial:", err.message);
    if (feeds.mondial.history.length) return res.json({ articles: feeds.mondial.history, cached: true, fetchedAt: feeds.mondial.lastFetch, warning: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/finance", async (req, res) => {
  try {
    const result = await fetchFeed("finance");
    res.json(result);
  } catch (err) {
    console.error("finance:", err.message);
    if (feeds.finance.history.length) return res.json({ articles: feeds.finance.history, cached: true, fetchedAt: feeds.finance.lastFetch, warning: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/france", async (req, res) => {
  try {
    const result = await fetchFeed("france");
    res.json(result);
  } catch (err) {
    console.error("france:", err.message);
    if (feeds.france.history.length) return res.json({ articles: feeds.france.history, cached: true, fetchedAt: feeds.france.lastFetch, warning: err.message });
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
