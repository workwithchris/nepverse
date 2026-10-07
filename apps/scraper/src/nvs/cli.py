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

SOURCE_CHOICES = ["osm", "wikivoyage", "wikidata", "all"]


def _utf8_stdout() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
        except (AttributeError, OSError, ValueError):
            pass


def _source_registry(settings) -> dict[str, object]:
    from nvs.sources.osm import HotosmSource, OsmSource
    from nvs.sources.wikidata import WikidataSource
    from nvs.sources.wikivoyage import WikivoyageSource

    return {
        "osm": OsmSource(settings),
        "wikivoyage": WikivoyageSource(settings),
        "wikidata": WikidataSource(settings),
        "hotosm": HotosmSource(settings),
    }


def _selected(source: str) -> list[str]:
    if source == "all":
        return ["osm", "wikivoyage", "wikidata"]
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
    registry = _source_registry(settings)
    for name in _selected(source):
        impl = registry[name]
        if dry_run:
            typer.echo(f"[plan] {name} (license={impl.license!r})")
            for line in impl.plan():
                typer.echo(f"  {line}")
            continue
        try:
            list(impl.fetch())
        except NotImplementedError as exc:
            typer.echo(f"[{name}] not implemented yet / no data: {exc}")
    if not dry_run:
        typer.echo("run finished: raw layer unchanged (0 new records).")


@app.command()
def export(
    out: Annotated[
        Path,
        typer.Option("--out", help="Output directory for JSON feeds.", show_default="../web/public/data"),
    ] = Path("../web/public/data"),
    format: Annotated[str, typer.Option("--format", help="Export format (json only for now).")] = "json",
) -> None:
    """Export places.json, trails.json and stats.json for the web viewer."""
    _utf8_stdout()
    settings = load_settings()
    target = out if out.is_absolute() else (APP_DIR / out)
    from nvs.pipeline.export import export_from_raw

    written = export_from_raw(target, settings)
    typer.echo(f"export format={format}")
    for label, path in written.items():
        typer.echo(f"  {label}: {path}")
    if not settings.raw_dir.exists() or not any(settings.raw_dir.iterdir()):
        typer.echo("no data: raw layer is empty (run extraction first).")


@app.command()
def stats() -> None:
    """Print dataset statistics from the raw layer."""
    _utf8_stdout()
    settings = load_settings()
    from nvs.pipeline.export import build_stats
    from nvs.storage.repo import RawRepository

    repo = RawRepository(settings)
    records = repo.records()
    places = repo.places()
    payload = build_stats(places, repo.trails())
    typer.echo(f"records={len(records)} places={len(places)} trails={payload['trails']}")
    typer.echo(f"by_type={payload['by_type']}")
    if not records:
        typer.echo("no data: raw layer is empty (run extraction first).")


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
