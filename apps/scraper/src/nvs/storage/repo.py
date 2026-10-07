from __future__ import annotations

from nvs.config import Settings, load_settings
from nvs.core.models import Place, SourceRecord, Trail
from nvs.pipeline.extract import read_all_records, write_batch
from nvs.pipeline.normalize import normalize_records
from nvs.pipeline.resolve import resolve, resolve_trails
from nvs.pipeline.trails import build_trails


class RawRepository:
    # TODO(M3): swap the JSONL/file backing store for Postgres + PostGIS

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or load_settings()

    def append(self, batch) -> None:
        write_batch(batch, self.settings)

    def records(self) -> list[SourceRecord]:
        return read_all_records(self.settings)

    def places(self) -> list[Place]:
        place_records = [
            r
            for r in self.records()
            if "geometry" not in r.payload and r.source not in {"elevation", "commons"}
        ]
        return resolve(normalize_records(place_records))

    def trails(self) -> list[Trail]:
        return resolve_trails(build_trails(self.records()))


_repository: RawRepository | None = None


def get_repository(settings: Settings | None = None) -> RawRepository:
    global _repository
    if _repository is None:
        _repository = RawRepository(settings)
    return _repository
