# NepalVerse Scraper — Plan

**Status:** Approved v1 · **Date:** 2026-10-06
**Goal:** A single, country-wide dataset of places, heritage, parks, restaurants, lodging, food, trails and sightseeing for Nepal, built to power the NepalVerse recommendation engine, plus a web viewer to browse the scraped data.

---

## 1. Objectives & Scope

- Cover **all of Nepal** — no cap on number of places, from Thamel cafés to remote Annapurna teahouses.
- **One canonical place record** per real-world entity, merged from many sources with full provenance.
- **Record depth:** name (en + ne), category, coordinates, address, hours, price level, rating + review count, tags, 1–2 photo URLs, short description, source URL + license.
- **Explicitly out of scope (v1):** bulk review text, real-time prices/booking, user-generated content.
- **Refresh:** weekly incremental pass; full re-seed monthly/on-demand.

**Decisions locked in:** open data + free APIs first · Python scraper · React+Vite viewer · full-country scale · weekly refresh · shadcn/ui themed with Vercel Geist tokens/fonts (single component system).

---

## 2. Data Sources

### Tier 0 — Bulk country seed (free, legal)

| Source                                   | Provides                                                                                                 | License        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------- |
| Geofabrik `nepal-latest.osm.pbf` (daily) | All POIs: `tourism`, `amenity`, `historic`, `leisure=park`, accommodation, peaks, waterfalls, viewpoints | ODbL           |
| Overpass API                             | `route=hiking`/`foot` trail relations (geometry), `boundary=protected_area`, `natural=peak`              | ODbL           |
| HDX HOTOSM Nepal POI (GeoJSON)           | Clipped POI export, validation cross-check                                                               | ODbL           |
| Overture Maps — Places theme             | Independent layer for dedup/validation                                                                   | Per-theme open |

### Tier 1 — Curated content (descriptions & listings)

| Source                     | Provides                                                                                                   | License                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Wikivoyage MediaWiki API   | Structured `{{listing}}` (See/Do/Eat/Drink/Sleep): name, lat/long, price, phone, description               | CC BY-SA 4.0                  |
| Wikipedia / Wikidata API   | Heritage (UNESCO: Kathmandu Valley, Sagarmatha, Chitwan, Lumbini), monuments, canonical labels + join keys | CC BY-SA / CC0                |
| Wikimedia Commons          | Photos with per-image license + author                                                                     | Mixed CC                      |
| Nepal Tourism Board, DNPWC | Official park/destination names, category facts                                                            | Facts only (no prose copying) |

### Tier 2 — Ratings & photos enrichment

| Source                                      | Provides                             | Notes                                                                          |
| ------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Google Places API (free tier: 10K/5K calls) | Ratings, review counts, photos       | Storage-restricted by Google ToS — snapshots / request-time lookup only        |
| Foursquare Places API (~100K calls/mo free) | Categories, attributes, ratings      | More storage-friendly                                                          |
| TripAdvisor Terra API                       | Travel-specific ratings/reviews      | 1,000 free entities, ~$0.015/entity; requires branding + link-back for display |
| Apify / SerpApi actors (fallback)           | Bulk Google Maps/TripAdvisor records | ~$1–25 per 1K — only if coverage gaps remain                                   |

### Tier 3 — Trails & trekking (differentiator)

- OSM hiking route relations → geometry, distance, network, endpoints.
- Wikivoyage trek articles (EBC, Annapurna Circuit, Langtang…) → day-by-day itinerary, difficulty, permits, best season.
- DEM (SRTM/Copernicus) → elevation gain/loss → **difficulty score**; peaks near trail → sum peaks.

---

## 3. Architecture

```
extractors (per source)
      ↓
raw layer — JSONL/Parquet, append-only, source-tagged   (immutable)
      ↓
normalizer — map to canonical place_type taxonomy
      ↓
entity resolver — name normalization (en/Devanagari/translit) + geo clustering
      ↓
canonical layer — places + place_sources (provenance), rebuildable from raw
      ↓
enrichers — tags, licensed photos, elevation, embeddings (pgvector)
      ↓
storage — Postgres + PostGIS + pgvector; JSONL lake for raw
      ↓
weekly refresher — diff pass (ratings, hours, closures)
      ↓
export → apps/web/public/data/*.json — feed consumed by the viewer / recommendation engine
```

**Design rule:** raw layer is immutable and provenance-tagged; the canonical `places` table is a derived view that can always be rebuilt. Dedup bugs and license audits stay fixable.

### Schema (core)

- `places` — id, name_en, name_ne, place_type, lat/lng, address, opening_hours, price_level, rating, review_count, description, tags, wikidata_id, status, license/attribution/source per record, timestamps
- `place_sources` — place_id, source, source_id, url, license, fetched_at _(many-to-one provenance)_
- `media` — place_id, url, license, author, attribution
- `trails` — id, name, geometry ([lat,lng] list), distance_km, elevation_gain_m, difficulty, best_season, permit_required, days, description
- `ratings_snapshot` — place_id, source, rating, count, captured_at _(time-series)_

### Canonical `place_type` taxonomy (v1)

`attraction, heritage, temple, museum, park, protected_area, viewpoint, waterfall, peak, restaurant, street_food, cafe, bar, lodging, guesthouse, homestay, trail, trekking_route, activity, transport, shop, healthcare, bank_atm, toilet, info_center, other`

### Entity resolution

1. Normalize names: lowercase, strip punctuation, drop suffixes (Hotel/Restro/Pyau…), Devanagari↔Latin transliteration.
2. Geo-cluster within 50–100 m (haversine now, PostGIS later), then `rapidfuzz` token-set score ≥ 88.
3. Merge by source trust: **Wikidata > OSM > Wikivoyage > Google > other**; lower-trust sources only fill gaps, never overwrite.
4. Manual override table for high-value entities (M3).

---

## 4. Tech Stack & Monorepo Layout

- **Monorepo:** Nx 23 (npm workspaces, package-based)
- **Scraper:** Python 3.12 via `uv`, Typer CLI (`nvs`), pydantic v2, httpx + tenacity (polite rate-limited client), rapidfuzz, polars, indic-transliteration, ruff, pytest. M2+: pyrosm/overpy, SQLAlchemy + GeoAlchemy2 (PostGIS).
- **Viewer:** React 19 + Vite + TypeScript, Tailwind CSS v4, shadcn/ui (new-york style) themed with Vercel Geist tokens + self-hosted Geist fonts, TanStack React Query v5, Zustand (filters/theme, persisted), React Hook Form + Zod v4, React Router v6, Vitest.
- **Storage:** JSONL raw layer + JSON feed export (M1) → Postgres + PostGIS + pgvector (M2/M3).
- **Jobs:** Nx targets now (`nx run scraper:*`); cron weekly at M4.

```
scrapper/                    # monorepo root (rename → nx later)
├── PLAN.md                  # this document
├── nx.json · package.json · tsconfig.base.json
├── apps/
│   ├── scraper/             # Python (Nx project: scraper)
│   │   ├── project.json     # targets: run, test, lint, export
│   │   ├── pyproject.toml · uv.lock · .python-version
│   │   ├── config/sources.yaml      # per-source: enabled, license, attribution, rps, trust, endpoints
│   │   ├── src/nvs/
│   │   │   ├── cli.py               # typer: version, run, export, stats
│   │   │   ├── config.py
│   │   │   ├── core/                # models, taxonomy, normalize, dedupe
│   │   │   ├── sources/             # base (PoliteClient), osm, hotosm, wikivoyage, wikidata
│   │   │   ├── pipeline/            # extract, normalize, resolve, export
│   │   │   └── storage/             # repo stub (PostGIS in M3)
│   │   ├── raw/                     # append-only JSONL lake (gitignored)
│   │   └── tests/
│   └── web/                 # React viewer (Nx project: @org/web)
│       ├── public/data/     # places.json, trails.json, stats.json (scraper export target)
│       └── src/
│           ├── app/         # main, App, router, layouts/AppShell, providers, theme
│           ├── core/        # api (http, types), config/env, lib/utils, stores (zustand)
│           ├── shared/      # ui/ (shadcn), hooks/, components/ (PageHeader, StatCard…)
│           ├── features/    # dashboard/, places/, trails/ (api.ts + components/ + pages/)
│           └── styles/      # Tailwind entry, Geist fonts, light/dark CSS vars
```

**Clean-architecture rule (web):** `features/*` may import from `shared`, `core`; `shared` may import from `core`; `core` imports nothing above it. Cross-project boundaries enforced by Nx ESLint.

---

## 5. Milestones

| Phase                  | Deliverable                                                                                          | Exit criteria                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **M0 Skeleton** ✅     | Nx monorepo, scraper CLI + core modules + tests, web viewer with sample data                         | `nx run-many -t build,test,lint,typecheck` green                    |
| **M1 Seed**            | OSM PBF + Overpass ingest, Wikivoyage listing parser, raw layer, normalizer, dedup v1                | Full-country `places.json`, dup rate < 5% on sampled cities         |
| **M2 Trek layer**      | Trail geometry, elevation/difficulty, protected areas, Wikidata heritage, Commons photos w/ licenses | 100+ trails with geometry; heritage sites have license-clean photos |
| **M3 Enrichment**      | Ratings via free tiers, embeddings, ratings_snapshot, Postgres/PostGIS                               | ≥60% of top-10K places have a rating                                |
| **M4 Refresh & serve** | Weekly cron diff pass, QA report (coverage/dup/closures), feed consumed by app                       | One unattended weekly run                                           |

---

## 6. Compliance Rules (enforced in code)

- Store `license` + `attribution` per record and per image (OSM ODbL, Wikivoyage CC BY-SA both require attribution; ODbL has share-alike for derived DBs — decide whether NepalVerse serves an API only or publishes the DB).
- Wikimedia: respect request-spacing guidance, descriptive User-Agent (`NepalVerseScraper/0.1 (...)`).
- Google Places: only store fields their caching terms permit; prefer Terra/Foursquare for durable travel ratings.
- No reviewer names/PII, no bulk review text.
- All fetches go through the shared `PoliteClient` (per-domain rate limits from `config/sources.yaml`); check `robots.txt` per domain.

---

## 7. Risks & Mitigations

| Risk                                  | Impact                    | Mitigation                                                               |
| ------------------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| Ratings gap (open data has none)      | Weak recommendations      | Free tiers first; measure coverage before spending                       |
| Sparse OSM data in rural/remote Nepal | Incomplete coverage       | Wikivoyage trek articles + manual curation queue for top-50 destinations |
| en/ne name mismatch breaks dedup      | Duplicates                | Transliteration normalization + Wikidata labels as canonical key         |
| Source ToS changes (Google/Terra)     | Legal/extraction breakage | Source abstraction layer; swap enricher without touching canonical model |
| Category taxonomy drift               | Bad recommendations       | Single canonical taxonomy + versioned per-source mapping tables          |

---

## 8. Open Questions (non-blocking)

1. Does the app consume an **API/export** from the DB directly, or static JSON feeds? (M1 assumes static feeds.)
2. Budget ceiling for paid enrichment (Terra/Apify) if free tiers fall short of 60% rating coverage?
3. Should photos be **hotlinked** (Commons/OSM) or mirrored locally (adds attribution obligations)?
4. Nepali-language content: is `name_ne` + translated descriptions v1 or v2?

---

## 9. Commands

```sh
# viewer
npx nx dev web          # http://localhost:4200
npx nx build web
npx nx test web

# scraper
npx nx run scraper:run -- --help
npx nx run scraper:test
npx nx run scraper:lint
npx nx run scraper:export -- --out ../web/public/data

# everything
npx nx run-many -t build,test,lint,typecheck
```
