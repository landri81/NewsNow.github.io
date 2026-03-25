const express = require("express");
const path = require("path");
const Parser = require("rss-parser");

const app = express();
const PORT = process.env.PORT || 3000;
const parser = new Parser({ timeout: 15000, headers: { "User-Agent": "NewzNow/2.0" } });

app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// ══════════════════════════════════════════════
//  RSS SOURCES — 100% gratuit, illimité
// ══════════════════════════════════════════════
const SOURCES = {
  mondial: [
    { url: "https://www.france24.com/fr/rss", name: "France 24", cat: "Géopolitique" },
    { url: "https://www.rfi.fr/fr/rss", name: "RFI", cat: "Géopolitique" },
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC World", cat: "Géopolitique" },
    { url: "https://www.lemonde.fr/international/rss_full.xml", name: "Le Monde", cat: "Géopolitique" },
    { url: "https://www.lemonde.fr/sciences/rss_full.xml", name: "Le Monde Sciences", cat: "Sciences" },
    { url: "https://www.lemonde.fr/sport/rss_full.xml", name: "Le Monde Sport", cat: "Sport" },
    { url: "https://www.euronews.com/rss", name: "Euronews", cat: "Société" },
    { url: "https://news.google.com/rss?hl=fr&gl=FR&ceid=FR:fr", name: "Google News FR", cat: "Société" },
  ],
  finance: [
    { url: "https://www.lemonde.fr/economie/rss_full.xml", name: "Le Monde Éco", cat: "Économie" },
    { url: "https://www.lesechos.fr/rss/rss_une.xml", name: "Les Echos", cat: "Bourse" },
    { url: "https://bfmbusiness.bfmtv.com/rss/info/flux-rss/flux-toutes-les-actualites/", name: "BFM Business", cat: "Entreprises" },
    { url: "https://www.capital.fr/feeds", name: "Capital", cat: "Investissement" },
    { url: "https://feeds.bbci.co.uk/news/business/rss.xml", name: "BBC Business", cat: "Bourse" },
    { url: "https://news.google.com/rss/search?q=bourse+finance+CAC40&hl=fr&gl=FR&ceid=FR:fr", name: "Google Finance FR", cat: "Bourse" },
  ],
  france: [
    { url: "https://www.francetvinfo.fr/titres.rss", name: "France Info", cat: "Société" },
    { url: "https://www.lemonde.fr/politique/rss_full.xml", name: "Le Monde Politique", cat: "Politique" },
    { url: "https://www.20minutes.fr/feeds/rss-une.xml", name: "20 Minutes", cat: "Société" },
    { url: "https://www.bfmtv.com/rss/info/flux-rss/flux-toutes-les-actualites/", name: "BFM TV", cat: "Société" },
    { url: "https://www.lefigaro.fr/rss/figaro_actualites.xml", name: "Le Figaro", cat: "Politique" },
    { url: "https://www.lemonde.fr/societe/rss_full.xml", name: "Le Monde Société", cat: "Société" },
    { url: "https://news.google.com/rss/search?q=france+actualit%C3%A9&hl=fr&gl=FR&ceid=FR:fr", name: "Google News France", cat: "Société" },
  ],
};

// ══════════════════════════════════════════════
//  PRIORITY ENGINE — mots-clés intelligents
// ══════════════════════════════════════════════
const CRITICAL_KW = /guerre|attentat|séisme|tsunami|krach|crash|explosion|mort[s]? |tué[s]?|victimes|urgence|alerte rouge|catastrophe|effondrement|éruption|inondation|terroris/i;
const HIGH_KW = /président|élection|réforme|milliard|record|historique|breaking|crise|scandale|démission|grève|manifestation|adoption|vote|sanctions|sommet|accord|traité|offensive|cessez/i;
const LOW_KW = /classement|sondage|tendance|étude montre|rapport suggère|pourrait|envisage|prévisions|top \d|liste des/i;

function detectPriority(title, summary) {
  const text = `${title} ${summary || ""}`;
  if (CRITICAL_KW.test(text)) return "critical";
  if (HIGH_KW.test(text)) return "high";
  if (LOW_KW.test(text)) return "low";
  return "medium";
}

// ══════════════════════════════════════════════
//  CATEGORY DETECTION
// ══════════════════════════════════════════════
const CAT_MAP_MONDIAL = {
  "Géopolitique": /guerre|conflit|diplomati|otan|onu|sanctions|frontière|territorial|géopolit|ukraine|gaza|iran|chine|russie|états-unis|sommet|traité|ambassad/i,
  "Économie": /économi|pib|inflation|récession|commerce|export|import|croissance|dette|budget|fiscal/i,
  "Technologie": /tech|ia |intelligence artificielle|robot|cyber|startup|numérique|digital|apple|google|meta|openai|spacex/i,
  "Environnement": /climat|environnement|réchauffement|carbone|pollution|biodiversité|cop\d|énergie renouvelable|sécheresse|inondation/i,
  "Sciences": /science|découverte|recherche|étude|nasa|spatial|médical|vaccin|adn|quantique/i,
  "Santé": /santé|hôpital|médecin|pandémie|épidémie|oms|maladie|cancer|médicament|vaccin/i,
  "Sport": /sport|football|rugby|tennis|jeux olympiques|ligue|champion|coupe|match|victoire|défaite|transfert/i,
  "Culture": /culture|film|cinéma|musique|art|exposition|festival|livre|théâtre|série/i,
  "Défense": /défense|armée|militaire|missile|nucléaire|otan|marine|aviation|soldat/i,
  "Sécurité": /sécurité|police|attentat|terroris|criminalité|prison|justice|tribunal|procès/i,
};

const CAT_MAP_FINANCE = {
  "Bourse": /bourse|cac.?40|s&p|nasdaq|dow jones|action|indice|cotation|wall street|euronext|hausse|baisse/i,
  "Crypto": /crypto|bitcoin|ethereum|blockchain|nft|token|binance|coinbase/i,
  "Devises": /devise|euro|dollar|yen|livre sterling|taux de change|forex/i,
  "Matières premières": /pétrole|or |gaz|matière première|opep|brent|cuivre|blé|commodit/i,
  "Entreprises": /entreprise|résultat|bénéfice|chiffre d'affaires|fusion|acquisition|ipo|introduction en bourse|pdg|ceo/i,
  "Banques centrales": /bce|fed|banque centrale|taux directeur|politique monétaire|inflation|déflation/i,
  "Immobilier": /immobilier|logement|loyer|hypothèque|prix au m²|construction/i,
  "Investissement": /investis|placement|épargne|rendement|dividende|portefeuille|etf|fonds/i,
  "FinTech": /fintech|paiement|néobanque|revolut|paypal|stripe/i,
  "Fiscalité": /impôt|fiscal|taxe|tva|niche fiscale|évasion/i,
};

const CAT_MAP_FRANCE = {
  "Politique": /politi|macron|assemblée|sénat|gouvernement|ministre|élection|réforme|loi |projet de loi|parti |gauche|droite|rn |lfi/i,
  "Économie": /économi|emploi|chômage|pib|entreprise|salaire|inflation|budget|dette|retraite/i,
  "Société": /société|éducation|école|université|jeune|senior|immigration|intégration|laïcité|religion/i,
  "Justice": /justice|tribunal|procès|condamn|prison|avocat|plainte|garde à vue|enquête judiciaire/i,
  "Santé": /santé|hôpital|médecin|samu|urgence|médicament|assurance maladie|sécu/i,
  "Sport": /sport|foot|psg|ligue 1|rugby|top 14|cyclisme|tour de france|roland garros|équipe de france/i,
  "Culture": /culture|cinéma|musique|festival|spectacle|patrimoine|musée|césar|cannes/i,
  "Régions": /région|département|commune|maire|métropole|rural|banlieue|outre-mer/i,
  "Éducation": /éducation|école|lycée|bac |université|étudiant|enseignant|parcoursup/i,
  "Environnement": /environnement|écologi|climat|pollution|transition|nucléaire|éolien|solaire/i,
  "Sécurité": /sécurité|police|gendarme|attentat|terroris|délinquance|cambriolage|incendie/i,
};

const CAT_MAPS = { mondial: CAT_MAP_MONDIAL, finance: CAT_MAP_FINANCE, france: CAT_MAP_FRANCE };

function detectCategory(title, summary, feedCat, feedName) {
  const text = `${title} ${summary || ""}`;
  // Try specific detection based on feed type
  for (const [tab, map] of Object.entries(CAT_MAPS)) {
    for (const [cat, regex] of Object.entries(map)) {
      if (regex.test(text)) return cat;
    }
  }
  return feedCat || "Société";
}

// ══════════════════════════════════════════════
//  STORE — 24h history
// ══════════════════════════════════════════════
const HISTORY_MS = 24 * 60 * 60 * 1000;
const CACHE_MS = 60 * 1000; // 1 minute cache

const store = {
  mondial: { articles: [], lastFetch: 0 },
  finance: { articles: [], lastFetch: 0 },
  france:  { articles: [], lastFetch: 0 },
};

function cleanOld(tab) {
  const cutoff = Date.now() - HISTORY_MS;
  store[tab].articles = store[tab].articles.filter(a => new Date(a.timestamp).getTime() > cutoff);
}

function dedup(articles) {
  const seen = new Set();
  return articles.filter(a => {
    // Normalize title for dedup
    const key = a.title.toLowerCase().replace(/[^a-zàâéèêëïôùûüç0-9]/g, "").slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ══════════════════════════════════════════════
//  FETCH RSS FEEDS
// ══════════════════════════════════════════════
async function fetchFeed(tab) {
  const sources = SOURCES[tab];
  if (!sources) return [];

  // Check cache
  if (store[tab].articles.length > 0 && Date.now() - store[tab].lastFetch < CACHE_MS) {
    return store[tab].articles;
  }

  const results = [];
  const fetchPromises = sources.map(async (src) => {
    try {
      const feed = await parser.parseURL(src.url);
      const items = (feed.items || []).slice(0, 15);
      for (const item of items) {
        const title = (item.title || "").trim();
        if (!title || title.length < 10) continue;

        const summary = (item.contentSnippet || item.content || item.description || "")
          .replace(/<[^>]*>/g, "").trim().slice(0, 200);
        const pubDate = item.pubDate || item.isoDate || new Date().toISOString();
        const timestamp = new Date(pubDate).toISOString();

        // Skip articles older than 24h
        if (Date.now() - new Date(timestamp).getTime() > HISTORY_MS) continue;

        const category = detectCategory(title, summary, src.cat, src.name);
        const priority = detectPriority(title, summary);

        results.push({
          title,
          summary: summary || title,
          details: null,
          priority,
          category,
          region: detectRegion(title, summary),
          timestamp,
          source: src.name,
          link: item.link || null,
        });
      }
    } catch (err) {
      console.warn(`RSS error [${src.name}]:`, err.message);
    }
  });

  await Promise.allSettled(fetchPromises);

  // Deduplicate, sort by priority then time
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = dedup(results).sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  // Merge with existing history
  const existingTitles = new Set(store[tab].articles.map(a => a.title.toLowerCase().slice(0, 60)));
  for (const a of sorted) {
    if (!existingTitles.has(a.title.toLowerCase().slice(0, 60))) {
      store[tab].articles.push(a);
    }
  }

  cleanOld(tab);

  // Re-sort history
  store[tab].articles.sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  store[tab].lastFetch = Date.now();
  return store[tab].articles;
}

function detectRegion(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  if (/france|paris|lyon|marseille|français/i.test(text)) return "France";
  if (/états-unis|usa|washington|trump|biden|américain/i.test(text)) return "États-Unis";
  if (/chine|pékin|beijing|chinois|xi jinping/i.test(text)) return "Chine";
  if (/russie|moscou|poutine|kremlin|russe/i.test(text)) return "Russie";
  if (/ukraine|kiev|kyiv|zelensky|ukrainien/i.test(text)) return "Ukraine";
  if (/europe|bruxelles|ue |union européenne/i.test(text)) return "Europe";
  if (/moyen.orient|gaza|israël|iran|syrie|liban/i.test(text)) return "Moyen-Orient";
  if (/afrique|africain|nigeria|kenya|sahel/i.test(text)) return "Afrique";
  if (/asie|japon|inde|corée/i.test(text)) return "Asie";
  if (/amérique latine|brésil|mexique|argentin/i.test(text)) return "Amérique latine";
  return "Monde";
}

// ══════════════════════════════════════════════
//  API ROUTES — prêtes pour app mobile
// ══════════════════════════════════════════════

// Web routes (legacy)
app.get("/api/news", async (req, res) => {
  try {
    const articles = await fetchFeed("mondial");
    res.json({ articles, count: articles.length, fetchedAt: store.mondial.lastFetch });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/finance", async (req, res) => {
  try {
    const articles = await fetchFeed("finance");
    res.json({ articles, count: articles.length, fetchedAt: store.finance.lastFetch });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/france", async (req, res) => {
  try {
    const articles = await fetchFeed("france");
    res.json({ articles, count: articles.length, fetchedAt: store.france.lastFetch });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── REST API v1 — pour l'app mobile ──
app.get("/api/v1/feed/:tab", async (req, res) => {
  const tab = req.params.tab;
  if (!SOURCES[tab]) return res.status(404).json({ error: "Feed inconnu. Utilisez: mondial, finance, france" });
  try {
    const articles = await fetchFeed(tab);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const paged = articles.slice(offset, offset + limit);
    res.json({
      feed: tab,
      articles: paged,
      total: articles.length,
      page,
      limit,
      hasMore: offset + limit < articles.length,
      fetchedAt: store[tab].lastFetch,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/v1/feeds", (req, res) => {
  res.json({
    feeds: ["mondial", "finance", "france"],
    endpoints: {
      feed: "/api/v1/feed/:tab?page=1&limit=20",
      search: "/api/v1/search?q=keyword&tab=mondial",
      stats: "/api/v1/stats",
    },
  });
});

app.get("/api/v1/search", async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const tab = req.query.tab || "mondial";
  if (!q) return res.status(400).json({ error: "Paramètre ?q= requis" });
  try {
    const articles = await fetchFeed(tab);
    const results = articles.filter(a =>
      a.title.toLowerCase().includes(q) || (a.summary && a.summary.toLowerCase().includes(q))
    );
    res.json({ query: q, feed: tab, articles: results, count: results.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/v1/stats", (req, res) => {
  const stats = {};
  for (const [tab, s] of Object.entries(store)) {
    const arts = s.articles;
    stats[tab] = {
      total: arts.length,
      critical: arts.filter(a => a.priority === "critical").length,
      high: arts.filter(a => a.priority === "high").length,
      medium: arts.filter(a => a.priority === "medium").length,
      low: arts.filter(a => a.priority === "low").length,
      lastFetch: s.lastFetch ? new Date(s.lastFetch).toISOString() : null,
      sources: [...new Set(arts.map(a => a.source))],
    };
  }
  res.json(stats);
});

// ══════════════════════════════════════════════
//  BACKGROUND REFRESH — toutes les 2 minutes
// ══════════════════════════════════════════════
async function backgroundRefresh() {
  console.log(`🔄 Background refresh at ${new Date().toLocaleTimeString("fr-FR")}`);
  try { await fetchFeed("mondial"); } catch (e) { console.warn("mondial:", e.message); }
  setTimeout(async () => {
    try { await fetchFeed("finance"); } catch (e) { console.warn("finance:", e.message); }
  }, 10000);
  setTimeout(async () => {
    try { await fetchFeed("france"); } catch (e) { console.warn("france:", e.message); }
  }, 20000);
}

app.listen(PORT, () => {
  console.log(`✅ NewzNow v2 running on http://localhost:${PORT}`);
  console.log(`📡 Sources: RSS feeds (100% gratuit)`);
  console.log(`📱 API mobile: /api/v1/feeds`);
  backgroundRefresh();
  setInterval(backgroundRefresh, 2 * 60 * 1000);
});
