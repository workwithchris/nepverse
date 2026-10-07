from __future__ import annotations

import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from nvs.config import Settings, load_settings
from nvs.core.models import Place, Trail
from nvs.pipeline.extract import read_all_records
from nvs.pipeline.normalize import normalize_records
from nvs.pipeline.resolve import resolve, resolve_trails


def build_stats(places: list[Place], trails: list[Trail]) -> dict:
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "places": len(places),
        "trails": len(trails),
        "by_type": dict(Counter(p.place_type.value for p in places)),
        "by_source": dict(Counter(s for p in places for s in p.source_ids)),
        "with_rating": sum(1 for p in places if p.rating is not None),
        "with_photos": sum(1 for p in places if p.wikidata_id),
    }


def write_export(
    out_dir: Path | str,
    places: list[Place],
    trails: list[Trail],
    fmt: str = "json",
) -> dict[str, Path]:
    target = Path(out_dir)
    target.mkdir(parents=True, exist_ok=True)
    written: dict[str, Path] = {}
    if fmt != "json":
        raise ValueError(f"unsupported export format: {fmt} (only json is implemented)")
    paths = {
        "places": target / "places.json",
        "trails": target / "trails.json",
        "stats": target / "stats.json",
    }
    paths["places"].write_text(
        json.dumps([p.model_dump(mode="json") for p in places], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    paths["trails"].write_text(
        json.dumps([t.model_dump(mode="json") for t in trails], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    paths["stats"].write_text(
        json.dumps(build_stats(places, trails), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    written.update(paths)
    return written


def export_from_raw(out_dir: Path | str, settings: Settings | None = None) -> dict[str, Path]:
    settings = settings or load_settings()
    records = read_all_records(settings)
    places = resolve(normalize_records(records))
    trails = resolve_trails([])
    return write_export(out_dir, places, trails)
