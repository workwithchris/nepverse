from __future__ import annotations

import sys
from pathlib import Path
from typing import Annotated

import typer

from nvs import __version__
from nvs.config import APP_DIR, load_settings

app = typer.Typer(
    name="nvs",
    help="NepalVerse scraper: extract, normalize and export Nepal place data.",
    add_completion=False,
    no_args_is_help=True,
)

SOURCE_CHOICES = ["osm", "trails", "wikivoyage", "wikidata", "commons", "elevation", "all"]

db_app = typer.Typer(help="Postgres storage: init schema, load canonical data.", no_args_is_help=True)
app.add_typer(db_app, name="db")


def _utf8_stdout() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
        except (AttributeError, OSError, ValueError):
            pass


def _source_registry(settings) -> dict[str, object]:
    from nvs.sources.commons import CommonsSource
    from nvs.sources.elevation import ElevationSource
    from nvs.sources.osm import HotosmSource, OsmSource
    from nvs.sources.trails import TrailsSource
    from nvs.sources.wikidata import WikidataSource
    from nvs.sources.wikivoyage import WikivoyageSource

    return {
        "osm": OsmSource(settings),
        "trails": TrailsSource(settings),
        "wikivoyage": WikivoyageSource(settings),
        "wikidata": WikidataSource(settings),
        "commons": CommonsSource(settings),
        "elevation": ElevationSource(settings),
        "hotosm": HotosmSource(settings),
    }


def _selected(source: str) -> list[str]:
    if source == "all":
        return ["osm", "trails", "wikivoyage", "wikidata", "commons", "elevation"]
    if source not in SOURCE_CHOICES:
        raise typer.BadParameter(f"invalid choice: {source} (choose from {SOURCE_CHOICES})")
    return [source]


@app.command()
def version() -> None:
    """Print the nvs scraper version."""
    typer.echo(__version__)


@app.command()
def run(
    source: Annotated[str, typer.Option("--source", help="Source to run: osm|wikivoyage|wikidata|all.")] = "all",
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Only print the extraction plan.")] = False,
) -> None:
    """Run extraction for one or all sources into the raw layer."""
    _utf8_stdout()
    settings = load_settings()
    from nvs.core.models import RawBatch
    from nvs.storage.repo import RawRepository

    repo = RawRepository(settings)
    registry = _source_registry(settings)
    total = 0
    for name in _selected(source):
        impl = registry[name]
        if dry_run:
            typer.echo(f"[plan] {name} (license={impl.license!r})")
            for line in impl.plan():
                typer.echo(f"  {line}")
            continue
        try:
            typer.echo(f"[{name}] extracting...")
            records = list(impl.fetch())
        except NotImplementedError as exc:
            typer.echo(f"[{name}] not implemented yet / no data: {exc}")
            continue
        if records:
            repo.append(RawBatch(source=name, records=records))
        total += len(records)
        typer.echo(f"[{name}] fetched {len(records)} records -> {settings.raw_dir / name}")
    if not dry_run:
        typer.echo(f"run finished: {total} records written to raw layer.")


@app.command()
def export(
    out: Annotated[
        Path,
        typer.Option("--out", help="Output directory for JSON feeds.", show_default="../web/public/data"),
    ] = Path("../web/public/data"),
    format: Annotated[str, typer.Option("--format", help="Export format (json only for now).")] = "json",
    no_dedupe: Annotated[
        bool, typer.Option("--no-dedupe", help="Skip entity resolution (fast; safe while OSM-only).")
    ] = False,
    limit: Annotated[
        int | None, typer.Option("--limit", help="Cap the number of places exported.")
    ] = None,
) -> None:
    """Export places.json, trails.json and stats.json for the web viewer."""
    _utf8_stdout()
    settings = load_settings()
    target = out if out.is_absolute() else (APP_DIR / out)
    from nvs.pipeline.export import export_from_raw

    written = export_from_raw(target, settings, dedupe_enabled=not no_dedupe, limit=limit)
    typer.echo(f"export format={format} dedupe={not no_dedupe} limit={limit}")
    for label, path in written.items():
        typer.echo(f"  {label}: {path}")
    if not settings.raw_dir.exists() or not any(settings.raw_dir.iterdir()):
        typer.echo("no data: raw layer is empty (run extraction first).")


@app.command()
def stats() -> None:
    """Print dataset statistics and dedupe QA from the raw layer."""
    _utf8_stdout()
    settings = load_settings()
    from nvs.core.dedupe import duplicate_rate
    from nvs.pipeline.export import build_stats
    from nvs.pipeline.normalize import normalize_records
    from nvs.pipeline.resolve import resolve
    from nvs.storage.repo import RawRepository

    repo = RawRepository(settings)
    records = repo.records()
    place_records = [
        r for r in records if "geometry" not in r.payload and r.source not in {"elevation", "commons"}
    ]
    normalized = normalize_records(place_records)
    places = resolve(normalized)
    payload = build_stats(places, repo.trails())
    typer.echo(
        f"records={len(records)} normalized={len(normalized)} "
        f"places={len(places)} trails={payload['trails']}"
    )
    typer.echo(f"dup_rate={duplicate_rate(len(normalized), len(places)):.3%} (merged away)")
    typer.echo(f"by_type={payload['by_type']}")
    if not records:
        typer.echo("no data: raw layer is empty (run extraction first).")


@app.command()
def serve(
    port: Annotated[int, typer.Option("--port", help="Port for the local job API.")] = 8787,
) -> None:
    """Serve a localhost job API so the web viewer can trigger scrapes."""
    from nvs.server import serve as run_server

    run_server(port=port)


@db_app.command("init")
def db_init(
    url: Annotated[str | None, typer.Option("--url", help="SQLAlchemy database URL.")] = None,
) -> None:
    """Create the Postgres schema (places, place_sources, trails)."""
    from nvs.storage.db import get_engine, init_db

    engine = get_engine(url)
    init_db(engine)
    typer.echo(f"schema ready at {engine.url}")


@db_app.command("load")
def db_load(
    url: Annotated[str | None, typer.Option("--url", help="SQLAlchemy database URL.")] = None,
    no_dedupe: Annotated[bool, typer.Option("--no-dedupe", help="Skip entity resolution.")] = False,
    limit: Annotated[int | None, typer.Option("--limit", help="Cap places loaded.")] = None,
) -> None:
    """Derive the canonical dataset from raw and load it into Postgres."""
    _utf8_stdout()
    settings = load_settings()
    from nvs.pipeline.export import build_dataset
    from nvs.storage.db import get_engine, init_db, load

    places, trails, media = build_dataset(
        settings, dedupe_enabled=not no_dedupe, limit=limit
    )
    engine = get_engine(url)
    init_db(engine)
    place_count, trail_count = load(engine, places, trails, media)
    typer.echo(f"loaded {place_count} places, {trail_count} trails -> {engine.url}")


@app.command(hidden=True)
def paths() -> None:
    """Print resolved paths for debugging."""
    settings = load_settings()
    typer.echo(f"app_dir={APP_DIR}")
    typer.echo(f"config={settings.config_path}")
    typer.echo(f"raw_dir={settings.raw_dir}")
    typer.echo(f"export_dir={settings.export_dir}")
    typer.echo(f"enabled={','.join(settings.enabled_sources())}")


def main() -> None:
    _utf8_stdout()
    app()


if __name__ == "__main__":
    main()
