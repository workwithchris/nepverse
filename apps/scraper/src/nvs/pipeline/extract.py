from __future__ import annotations

import json
from collections.abc import Iterator
from datetime import date
from pathlib import Path

from nvs.config import Settings, load_settings
from nvs.core.models import RawBatch, SourceRecord


def raw_path(source: str, settings: Settings | None = None, day: date | None = None) -> Path:
    settings = settings or load_settings()
    day = day or date.today()
    return settings.raw_dir / source / f"{day.isoformat()}.jsonl"


def write_batch(batch: RawBatch, settings: Settings | None = None) -> Path:
    settings = settings or load_settings()
    path = raw_path(batch.source, settings)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        for record in batch.records:
            handle.write(record.model_dump_json() + "\n")
    return path


def read_records(source: str, settings: Settings | None = None) -> list[SourceRecord]:
    settings = settings or load_settings()
    source_dir = settings.raw_dir / source
    if not source_dir.exists():
        return []
    records: list[SourceRecord] = []
    for path in sorted(source_dir.glob("*.jsonl")):
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
