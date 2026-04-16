# 🗺️ Geocache Explorer

> Explore geocaches from the [OpenCaching network](https://www.opencaching.de) and extract funny, interesting facts from finder logs using Claude AI.

![Geocache Explorer](https://img.shields.io/badge/powered%20by-OKAPI-40f5c8?style=flat-square) ![React](https://img.shields.io/badge/React-18-c8f540?style=flat-square) ![Vite](https://img.shields.io/badge/Vite-5-c8f540?style=flat-square) ![Claude AI](https://img.shields.io/badge/Claude-Sonnet-40f5c8?style=flat-square)

**[→ Live Demo](https://christoph-teichmeister.github.io/geocache-explorer/)**

---

## What it does

Geocache Explorer connects to the [OKAPI](https://www.opencaching.de/okapi/) — the public REST API for national OpenCaching sites — and lets you browse real geocaches in any area. For each cache, it loads up to 50 finder log entries. Hit the **🤖 Generate Fun Facts** button and Claude AI analyses the logs to surface what makes that cache interesting: funny near-misses, unusually dedicated finders, suspiciously short DNF comments, epic adventure stories, and more.

### Features

- **Bounding box search** — search any rectangular area by coordinates, with one-click presets for Berlin, Vienna, Munich, and Cologne
- **Cache browser** — shows type (Traditional, Multi, Mystery…), difficulty/terrain rating, and size
- **Log viewer** — all finder logs with Found/DNF indicators, dates, and full comments
- **Cache details** — description, total founds, DNFs, recommendations, hidden date
- **AI fun facts** — Claude reads the logs and extracts 6–8 categorised insights (FUNNY, UNUSUAL, ADVENTURE, MYSTERY, QUIRKY, STATS, EMOTIONAL, DISCOVERY)
- **Connection test** — one-click ping to verify your API key and network reach before searching

---

## Getting started

### 1. Get a free OKAPI consumer key

Go to **[opencaching.de/okapi/signup.html](https://www.opencaching.de/okapi/signup.html)** and register a new application. It takes about a minute and requires a free OpenCaching account.

### 2. Open the app

Visit **[christoph-teichmeister.github.io/geocache-explorer](https://christoph-teichmeister.github.io/geocache-explorer/)** (or run it locally — see below).

### 3. Explore

1. Paste your consumer key into the key field
2. Click **Test connection** to verify it works
3. Pick a preset city or enter a custom bounding box (`S lat, W lon, N lat, E lon`)
4. Click **Search Caches**
5. Select a cache from the sidebar
6. Click **🤖 Generate Fun Facts** on the Logs tab

---

## Running locally

```bash
git clone https://github.com/christoph-teichmeister/geocache-explorer.git
cd geocache-explorer
npm install
npm run dev
```

Open [localhost:5173/geocache-explorer/](http://localhost:5173/geocache-explorer/).

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Geocache data | [OKAPI](https://www.opencaching.de/okapi/) — OpenCaching REST API |
| AI analysis | [Claude Sonnet](https://www.anthropic.com) via Anthropic API |
| Hosting | GitHub Pages (auto-deploy via GitHub Actions) |
| Styling | Inline CSS-in-JS (no dependencies) |

The app is fully client-side — no backend, no database, no secrets stored. Your OKAPI consumer key and Anthropic API key stay in your browser session only.

---

## Architecture

```
Browser
  │
  ├── OKAPI (opencaching.de)          ← geocache search, details, logs
  │     └── services/caches/search/bbox
  │     └── services/caches/geocaches
  │     └── services/logs/logs
  │
  └── Anthropic API (api.anthropic.com) ← fun facts generation
        └── claude-sonnet-4 /v1/messages
```

OKAPI supports `Access-Control-Allow-Origin: *` so all requests go directly from the browser — no proxy needed.

---

## Deployment

Every push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`), which:

1. Installs dependencies (`npm install`)
2. Builds the app (`vite build`)
3. Deploys `dist/` to GitHub Pages

The `base` path in `vite.config.js` is set to `/geocache-explorer/` to match the repo name.

---

## Data sources

- Geocache data © [OpenCaching network](https://www.opencaching.de) contributors, licensed under [CC BY-SA](https://creativecommons.org/licenses/by-sa/3.0/)
- API access via [OKAPI](https://github.com/opencaching/okapi) — the open standard API for national OpenCaching sites

---

## License

MIT
