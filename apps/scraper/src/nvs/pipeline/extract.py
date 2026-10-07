from __future__ import annotations

import json
from collections.abc import Iterator
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import polars as pl

from nvs.config import Settings, load_settings
from nvs.core.models import RawBatch, SourceRecord

# Bump a source's version when its payload schema changes so a fresh raw file is
# written instead of silently skipping existing source_ids.
RAW_SCHEMA: dict[str, int] = {
    "osm": 1,
    "trails": 1,
    "wikivoyage": 1,
    "wikidata": 1,
    "commons": 1,
    "elevation": 1,
    "hotosm": 1,
}
DEFAULT_SCHEMA = 1


def schema_version(source: str) -> int:
    return RAW_SCHEMA.get(source, DEFAULT_SCHEMA)


def raw_path(source: str, settings: Settings | None = None, day: date | None = None) -> Path:
    settings = settings or load_settings()
    day = day or date.today()
    version = schema_version(source)
    return settings.raw_dir / source / f"v{version}" / f"{day.isoformat()}.jsonl"


def parquet_path(source: str, settings: Settings | None = None, day: date | None = None) -> Path:
    return raw_path(source, settings, day).with_suffix(".parquet")


def manifest_path(source: str, settings: Settings | None = None) -> Path:
    settings = settings or load_settings()
    return settings.raw_dir / source / "manifest.json"


def write_batch(batch: RawBatch, settings: Settings | None = None) -> Path:
    """Append records, skipping ``source_id`` values already in today's file (idempotent)."""
    settings = settings or load_settings()
    path = raw_path(batch.source, settings)
    path.parent.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    if path.exists():
        seen = {record.source_id for record in read_file(path)}
    with path.open("a", encoding="utf-8") as handle:
        for record in batch.records:
            if record.source_id in seen:
                continue
            seen.add(record.source_id)
            handle.write(record.model_dump_json() + "\n")
    _write_parquet(path, settings, batch.source)
    _write_manifest(batch.source, settings)
    return path


def _write_parquet(jsonl: Path, settings: Settings, source: str) -> None:
    rows: list[dict[str, Any]] = []
    for record in read_file(jsonl):
        rows.append(
            {
                "source": record.source,
                "source_id": record.source_id,
                "source_url": record.source_url,
                "license": record.license,
                "attribution": record.attribution,
                "fetched_at": record.fetched_at.isoformat(),
                "payload_json": json.dumps(record.payload, ensure_ascii=False),
            }
        )
    if not rows:
        return
    pl.DataFrame(rows).write_parquet(parquet_path(source, settings, date.fromisoformat(jsonl.stem)))


def _write_manifest(source: str, settings: Settings) -> None:
    files = sorted(p for p in (settings.raw_dir / source).rglob("*.jsonl"))
    records = sum(1 for path in files for _ in read_file(path))
    manifest = {
        "source": source,
        "schema_version": schema_version(source),
        "records": records,
        "files": [str(path.relative_to(settings.raw_dir)) for path in files],
        "updated_at": datetime.now(UTC).isoformat(),
    }
    path = manifest_path(source, settings)
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def read_records(source: str, settings: Settings | None = None) -> list[SourceRecord]:
    settings = settings or load_settings()
    source_dir = settings.raw_dir / source
    if not source_dir.exists():
        return []
    records: list[SourceRecord] = []
    for path in sorted(source_dir.rglob("*.jsonl")):
        records.extend(read_file(path))
    return records


def read_file(path: Path) -> Iterator[SourceRecord]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            yield SourceRecord.model_validate(json.loads(line))


def read_all_records(settings: Settings | None = None) -> list[SourceRecord]:
    settings = settings or load_settings()
    if not settings.raw_dir.exists():
        return []
    out: list[SourceRecord] = []
    for source_dir in sorted(settings.raw_dir.iterdir()):
        if source_dir.is_dir():
            out.extend(read_records(source_dir.name, settings))
    return out
