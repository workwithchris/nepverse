# NepalVerse

NepalVerse is a local web atlas of places and walking routes in Nepal. The website reads JSON files produced by a separate Python scraper. **You can open the website immediately with the included data; scraping is optional.**

## Start the website

### What you need

- A computer with an internet connection (for installation, map tiles, and photos).
- [Node.js](https://nodejs.org/en/download) **22.12 or newer** (or version 20.19+ within the 20.x line); npm comes with it. You do **not** need Python just to view the website.
- A copy of this project. On GitHub, choose **Code → Download ZIP**, extract it, and open the extracted project folder; cloning with Git also works.

Open a terminal in the **project root**: the folder containing this `README.md`, `package.json`, and the `apps` folder. In Windows File Explorer, open that folder and choose **Open in Terminal**. On macOS, use **New Terminal at Folder** (or open Terminal and navigate to the folder). Run these commands there:

```sh
npm ci
npm exec nx run "@org/web:dev"
```

Wait for the terminal to show a local URL, then open **http://localhost:4200** in a browser. If port 4200 is busy, use the URL printed in the terminal instead. Leave the terminal running while you browse; press **Ctrl+C** to stop the website.

The included files in `apps/web/public/data/` are enough to browse without running a scraper. The browser needs internet access to load the OpenStreetMap background tiles and any externally hosted photos.

## Collect fresh data (optional)

If the website is already running, open a **second terminal in the project root** for the commands below. Leave the first terminal open so the website stays running; or stop it with Ctrl+C and restart it later.

Scraping contacts public third-party services. It may take a while, and a full run downloads a large Nepal OpenStreetMap file. Have a reliable internet connection and several GB of free disk space before a full run. No API keys are needed for the supported public sources.

### One-time scraper setup

1. Install [uv](https://docs.astral.sh/uv/getting-started/installation/) for your operating system. It manages Python and the scraper dependencies.
2. In a terminal at the **project root**, run:

   ```sh
   uv python install 3.12
   uv sync --project apps/scraper
   ```

   The scraper uses Python 3.12 (`apps/scraper/.python-version`). Installing its Python dependencies may take several minutes.

3. Before scraping, open `apps/scraper/config/sources.yaml` in a text editor. Replace the example `http.user_agent` URL and email (`nepalverse.example; contact@example.com`) with a real way for data providers to contact you. The scraper sends this identification with its requests. The HTTP client throttles requests using `http.default_rate_limit_rps`; respect each source's terms and do not raise the request rate without checking them. If you publish your copy of the project, use a project contact rather than a private email address.

### First, preview a scrape without downloading anything

```sh
npm exec nx run scraper:run -- --source wikidata --dry-run
```

`--dry-run` prints an indicative source plan but does **not** fetch or overwrite data. Some listed fallback or enrichment requests are not implemented in the current extractor. This command also checks that the scraper starts correctly.

### Scrape places and update the website

**Before exporting:** On a new download, the raw folder is empty. If you export after scraping only Wikidata, the included `trails.json` will be replaced with an empty trails list. Back up `apps/web/public/data/` first, or run the Overpass trails command below **before** your first export if you want to keep trails visible.

```sh
npm exec nx run scraper:run -- --source wikidata
npm exec nx run scraper:export
```

The first command downloads place records to `apps/scraper/raw/wikidata/`. The second converts **all available raw records** into `apps/web/public/data/places.json`, `trails.json`, and `stats.json`. Refresh the browser tab after the export; if you still see old numbers, reload the page fully.

A Wikidata-only scrape gives you places, **not trekking route geometry**. To add mapped trails (and, if you like, elevation gain for them), run:

```sh
npm exec nx run scraper:run -- --source overpass
npm exec nx run scraper:run -- --source elevation
npm exec nx run scraper:export
```

The elevation step reads the Overpass trail geometry you already scraped and adds elevation gain from NASA SRTM data via OpenTopoData. Run it after Overpass, not before. If you only want trails without elevation, just run Overpass and then export:

```sh
npm exec nx run scraper:run -- --source overpass
npm exec nx run scraper:export
```

For the broader dataset, you can instead run all implemented sources, then export:

```sh
npm exec nx run scraper:run -- --source all
npm exec nx run scraper:export
```

`all` runs **OSM/Geofabrik, Overpass trails, Wikivoyage, Wikidata, Wikimedia Commons, and OpenTopoData elevation** in that order. OSM downloads a large `.osm.pbf` file the first time and reuses it on later runs. Commons photos are matched to existing Wikidata records, and elevation is computed from already-scraped Overpass trail geometry. Public services can time out, rate-limit, or be temporarily unavailable; wait before retrying rather than repeatedly sending requests.

**Important:** Export reads every file already in `apps/scraper/raw/`, not only your latest scrape. Raw files are stored as dated JSONL files and are not committed to Git. Export **replaces** the three JSON files in `apps/web/public/data/`, which _are_ tracked by Git. Make a copy of that data folder before exporting if you need to keep its current contents.

**Refreshing an existing scrape:** Re-running a source on the same day skips IDs already stored in that day's raw file. Exports also read earlier days, so repeated scrapes may retain old values. To refresh one source, first back up `apps/scraper/raw/`, then move that source's dated `.jsonl` files out of `apps/scraper/raw/<source>/` before running that source again and exporting. Do not remove raw data unless you are comfortable losing records that may not be fetched again.

### Other useful commands

Run these from the project root:

```sh
# Preview intended sources and endpoints without making requests
npm exec nx run scraper:run -- --dry-run

# Run just one other source (choose osm, overpass, wikivoyage, wikidata, commons, or elevation)
npm exec nx run scraper:run -- --source wikivoyage

# Inspect counts in the locally saved raw records
uv run --project apps/scraper nvs stats

# Re-export existing raw data without scraping again
npm exec nx run scraper:export
```

Commercial sources listed in `sources.yaml` (Google Places, Foursquare, TripAdvisor) are disabled and are **not** implemented by the `run` command. Do not turn them on expecting them to work without additional integration and their own terms or credentials.

The scraper also has an optional **local-only job API**:

```sh
npm exec nx run scraper:serve
```

It listens on `http://127.0.0.1:8787` and is for development or automation. **You do not need it to browse the website or use the terminal scraping commands. Do not expose it to the internet.** Press Ctrl+C to stop it.

## Checks for contributors

```sh
npm exec nx run "@org/web:test" -- --run
npm exec nx run "@org/web:lint"
npm exec nx run "@org/web:typecheck"
npm exec nx run "@org/web:build"
npm exec nx run scraper:test
npm exec nx run scraper:lint
```

To view the built website locally, run `npm exec nx run "@org/web:preview"` and open **http://localhost:4300** (or the URL printed in the terminal). `npm exec nx show projects` lists workspace projects if you need to check their names.

## Where the files live

- `apps/web/` — React/Vite website. Its default data URL is `/data`, which serves `apps/web/public/data/` in development. No `.env` file is required for local use.
- `apps/scraper/` — Python extractor and exporter; `apps/scraper/config/sources.yaml` holds source settings. Only the default HTTP rate limit is currently applied by the client; per-source rate limits in that file are not wired up yet.
- `apps/scraper/raw/` — locally scraped records and the cached OSM download. This folder is ignored by Git.
- `apps/web/public/data/` — the exported `places.json`, `trails.json`, and `stats.json` loaded by the website.

## If something goes wrong

- **`npm` not found:** install Node.js, close and reopen the terminal, then run `npm ci` again.
- **`uv` not found:** install uv from the link above and reopen the terminal. If Python or a native Python dependency fails to install, confirm `uv python install 3.12` succeeded. Some platforms also need native build tools for `pyrosm`; you can still run the website with its included data without Python.
- **`nx` or a module not found:** run `npm ci` at the project root first. Use the commands above from that same folder, not from `apps/web` or `apps/scraper`.
- **Blank map or missing images:** check your internet connection. Background tiles and photos come from external services; the JSON data itself is local.
- **No new places or trails after scraping:** run `scraper:export` after `scraper:run`, then reload the website. Wikidata supplies places; Overpass supplies trails. Check `apps/scraper/raw/` for records and `apps/web/public/data/` for the updated JSON files.
- **Source request fails:** public APIs may be down or rate-limited. Try that source again later; the website can still run with the existing exported data.

## Data attribution

Place and route data comes from OpenStreetMap contributors (ODbL), Wikidata (CC0), Wikivoyage contributors (CC BY-SA), NASA/USGS SRTM elevation data via OpenTopoData (public domain), and individual Wikimedia Commons files with their own photo licenses. Exported place records include source and photo metadata, and the website credits OpenStreetMap on its maps. **Do not rely on merged place records as a definitive license list:** a secondary source may be shown with the primary source's URL or license. Consult the original source and records in `apps/scraper/raw/` before redistributing data. Exported trail records do not yet include a separate source URL or license per trail; preserve OpenStreetMap attribution. Check each photo's own license and author credit before reusing it.
