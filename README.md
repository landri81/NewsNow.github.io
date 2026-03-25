# ⚡ NewzNow v2

Fil d'actualité en temps réel, 100% gratuit, alimenté par flux RSS.

## 📁 Structure
```
newznow/
├── server.js          ← Backend (RSS feeds + API REST)
├── package.json
├── public/
│   └── index.html     ← Interface web
└── README.md
```

## 💰 Coût: 0€
Aucune API payante. Sources 100% RSS (France24, RFI, BBC, Le Monde, Les Echos, BFM, France Info, etc.)

## 🚀 Déploiement sur Render.com
1. Upload sur GitHub
2. Render → New Web Service → connecter le repo
3. Runtime: Node / Build: `npm install` / Start: `npm start`
4. **Aucune variable d'environnement requise**
5. C'est tout !

## 📱 API REST pour app mobile
- `GET /api/v1/feeds` — liste des feeds disponibles
- `GET /api/v1/feed/mondial?page=1&limit=20` — articles paginés
- `GET /api/v1/feed/finance`
- `GET /api/v1/feed/france`
- `GET /api/v1/search?q=keyword&tab=mondial` — recherche
- `GET /api/v1/stats` — statistiques par feed
