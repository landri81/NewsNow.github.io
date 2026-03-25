# ⚡ NewzNow

Fil d'actualité mondial alimenté par Claude AI, mis à jour automatiquement toutes les 5 minutes.

## 📁 Structure

```
newznow/
├── server.js          ← Serveur backend (protège ta clé API)
├── package.json       ← Dépendances
├── public/
│   └── index.html     ← L'interface (ce que les visiteurs voient)
└── README.md
```

## 🚀 Déploiement gratuit sur Render.com

### Étape 1 — Obtenir ta clé API Anthropic
1. Va sur https://console.anthropic.com
2. Crée un compte si nécessaire
3. Va dans "API Keys" → "Create Key"
4. Copie la clé (commence par `sk-ant-...`)

### Étape 2 — Mettre le code sur GitHub
1. Crée un compte GitHub (github.com) si tu n'en as pas
2. Crée un nouveau repository → nomme-le `newznow`
3. Upload les fichiers du projet

### Étape 3 — Déployer sur Render.com (gratuit)
1. Va sur https://render.com → connecte-toi avec GitHub
2. "New +" → "Web Service" → connecte le repo `newznow`
3. Configure :
   - **Name** : newznow
   - **Region** : Frankfurt (EU)
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : Free
4. Ajoute la variable d'environnement :
   - **Key** : `ANTHROPIC_API_KEY`
   - **Value** : ta clé `sk-ant-...`
5. Clique "Create Web Service"

✅ Ton site sera en ligne à `https://newznow.onrender.com`

## 💰 Coûts
- **Hébergement** : Gratuit (Render)
- **API Claude** : ~3-9€/mois (refresh toutes les 5 min 24/7)
