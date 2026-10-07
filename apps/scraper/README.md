# nvs-scraper

Python scraper and data pipeline for **NepalVerse**, a travel recommendation engine for Nepal.
It merges country-wide place data (heritage, parks, restaurants, lodging, food, trails,
sightseeing) from multiple open sources into a provenance-tagged dataset exported as JSON
feeds for the web viewer.

## Install

```powershell
uv sync
```

Requires `uv` and Python 3.12 (provision with `uv python install 3.12`).

## Usage

```powershell
uv run nvs --help
uv run nvs version
uv run nvs run --source all --dry-run
uv run nvs export --out ../web/public/data
uv run nvs stats
```

## Pipeline stages

1. **extract** — pull each source through a polite rate-limited HTTP client.
2. **raw layer** — append-only JSONL, source-tagged, at `raw/{source}/{date}.jsonl`.
3. **normalize** — map source categories onto the canonical `place_type` taxonomy and clean names.
4. **entity resolve** — name normalization (incl. Devanagari transliteration), geo clustering,
   fuzzy dedupe via rapidfuzz with a trust ordering (wikidata > osm > wikivoyage > google > other).
5. **enrich** — photos, descriptions, ratings (source-tiered).
6. **export** — `places.json`, `trails.json`, `stats.json` for the web viewer.

## Source tiers

| Tier | Source | License | Notes |
|------|--------|---------|-------|
| T0 | Geofabrik OSM PBF + Overpass + HDX HOTOSM POI | ODbL-1.0 | bulk seed |
| T1 | Wikivoyage / Wikipedia / Wikidata / Commons | CC BY-SA 4.0, CC0, CC BY-SA 4.0 | content + photos |
| T2 | Google Places / Foursquare / TripAdvisor Terra | provider terms | ratings stubs, config-driven |
| T3 | OSM `route=hiking` relations + DEM elevation | ODbL-1.0 | trails, stub |

Every record stores `license`, `attribution` and `source_url`. No bulk review text, no PII.

## Roadmap

**M1 (current)** — skeleton: project layout, pydantic models, canonical taxonomy, name
normalization with Devanagari transliteration, fuzzy dedupe, config-driven source registry,
CLI, and unit tests. Source `fetch()` implementations raise `NotImplementedError`; `plan()`
returns the exact queries each source will run.

**M2** — real extraction: Overpass queries, Geofabrik PBF ingestion via pyrosm, Wikivoyage
MediaWiki listings, Wikidata SPARQL, Commons photos; raw JSONL layer written per source per day;
enrichment stage filled in.

**M3** — persistence and resolution: Postgres + PostGIS storage behind `storage/repo.py`,
geo-clustering dedupe, DEM elevation for trails, and scheduled exports for the web viewer.
