# snf-news-aggregator - Claude Code Onboarding Bundle

> **Auto-generated** - Do not edit manually
> Last updated: 2025-12-31 09:42:35
> Project: /Users/nikolashulewsky/Projects/snf-news-aggregator

This bundle contains all essential project context for onboarding new Claude Code sessions.

---

## ./package.json

```json
{
  "name": "snf-news-aggregator",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "server": "node server/index.js",
    "dev:all": "concurrently \"npm run server\" \"npm run dev\"",
    "build": "vite build",
    "start": "npm run build && npm run server",
    "preview": "vite preview"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.65.0",
    "@react-google-maps/api": "^2.20.7",
    "@xenova/transformers": "^2.17.2",
    "cheerio": "^1.1.2",
    "cors": "^2.8.5",
    "csv-parse": "^6.1.0",
    "d3-geo": "^3.1.1",
    "d3-geo-projection": "^4.0.0",
    "d3-scale": "^4.0.2",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.3",
    "express": "^5.1.0",
    "lucide-react": "^0.544.0",
    "node-cache": "^5.1.2",
    "node-cron": "^4.2.1",
    "node-fetch": "^3.3.2",
    "openai": "^4.104.0",
    "pdf-parse": "^2.3.5",
    "pg": "^8.16.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.9.3",
    "rss-parser": "^3.13.0",
    "topojson-client": "^3.1.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "autoprefixer": "^10.4.21",
    "concurrently": "^9.2.1",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.14",
    "vite": "^7.1.9"
  }
}
```

---

## Project Structure

```
total 1328
drwxr-xr-x   51 nikolashulewsky  staff    1632 Dec 29 10:21 .
drwxr-xr-x   11 nikolashulewsky  staff     352 Dec 29 10:37 ..
-rw-r--r--    1 nikolashulewsky  staff    2038 Dec  9 08:50 .claudemd
-rw-------    1 nikolashulewsky  staff     100 Dec  9 13:05 .env
-rw-r--r--    1 nikolashulewsky  staff     257 Dec  9 08:50 .env.example
drwxr-xr-x   13 nikolashulewsky  staff     416 Dec 11 22:52 .git
-rw-r--r--    1 nikolashulewsky  staff     307 Dec  9 08:50 .gitignore
-rw-r--r--    1 nikolashulewsky  staff     578 Dec  9 08:50 .renderignore
-rw-r--r--    1 nikolashulewsky  staff   11524 Dec  9 08:50 ARCHITECTURE_CONTEXT.md
drwxr-xr-x    3 nikolashulewsky  staff      96 Dec  9 08:50 backend
-rw-r--r--    1 nikolashulewsky  staff     582 Dec  9 08:50 check-article-urls.js
-rw-r--r--    1 nikolashulewsky  staff    1772 Dec 31 09:42 CLAUDE_ONBOARDING_snf-news-aggregator.md
-rw-r--r--    1 nikolashulewsky  staff   24352 Dec 29 10:10 COMPREHENSIVE_DATA_SOURCES.md
-rw-r--r--    1 nikolashulewsky  staff    7705 Dec  9 08:50 CONTEXT.md
-rw-r--r--    1 nikolashulewsky  staff     669 Dec  9 08:50 count-by-source.js
drwxr-xr-x    5 nikolashulewsky  staff     160 Dec  9 08:50 Data
-rw-r--r--    1 nikolashulewsky  staff    7412 Dec  9 08:50 DATA_SOURCES_INVENTORY.md
drwxr-xr-x    4 nikolashulewsky  staff     128 Dec  9 08:50 database
-rw-r--r--    1 nikolashulewsky  staff    5668 Dec  9 08:50 DATABASE_MIGRATION_GUIDE.md
-rw-r--r--    1 nikolashulewsky  staff    2552 Dec  9 08:50 DEPLOY_TO_RENDER.md
-rw-r--r--    1 nikolashulewsky  staff    7603 Dec  9 08:50 DEVELOPMENT_ROADMAP.md
-rw-r--r--    1 nikolashulewsky  staff    1867 Dec  9 08:50 diagnose-duplicates.js
-rw-r--r--    1 nikolashulewsky  staff    1122 Dec  9 08:50 diagnostic-image-check.js
-rw-r--r--    1 nikolashulewsky  staff     451 Dec  9 08:50 Dockerfile
drwxr-xr-x    4 nikolashulewsky  staff     128 Dec  9 08:50 docs
-rw-r--r--    1 nikolashulewsky  staff       9 Dec  9 08:50 gh.tar.gz
-rw-r--r--    1 nikolashulewsky  staff    3014 Dec  9 08:50 IDEAS.md
-rw-r--r--    1 nikolashulewsky  staff     306 Dec  9 08:50 index.html
drwxr-xr-x  388 nikolashulewsky  staff   12416 Dec  9 15:11 node_modules

backend/:
data

server/:
add-ma-columns.js
add-relevance-tier-column.js
analyze-filtered-bills.js
analyze-ma-deals.js
backfill-ma-2025.js
check-article-content.js
check-bed-counts.js
check-collection-progress.sh
check-duplicates.js
check-frontend-duplicates.js
check-market-metrics.js
check-missing-deals.js
check-one-deal.js
check-org-tags.js
check-unknown-acquirers.js
collect-congress.js
collect-federal-register-to-json.js
collect-federal-register.js
collectors
CONGRESS_COLLECTOR_SETUP.md

src/:
App.css
App.jsx
components
config
data
index.css
main.jsx
services

```
