from __future__ import annotations

from collections.abc import Iterator

from nvs.core.models import SourceRecord
from nvs.sources.base import SourceBase

DEFAULT_API = "https://api.opentopodata.org/v1/srtm90m"
MAX_POINTS = 100
NOISE_M = 5.0


def sample_points(geometry: list[list[float]], limit: int = MAX_POINTS) -> list[list[float]]:
    if len(geometry) <= limit:
        return geometry
    step = len(geometry) / limit
    return [geometry[int(i * step)] for i in range(limit)]


def elevation_gain(elevations: list[float], noise_m: float = NOISE_M) -> int:
    gain = 0.0
    for previous, current in zip(elevations, elevations[1:], strict=False):
        delta = current - previous
        if delta > noise_m:
            gain += delta
    return int(round(gain))


class ElevationSource(SourceBase):
    name = "elevation"
    license = "SRTM (public domain, NASA/USGS via OpenTopoData)"
    attribution = "Elevation: SRTM / OpenTopoData"

    def _api(self) -> str:
        return self.endpoints.get("api", DEFAULT_API)

    def _trail_records(self) -> list[SourceRecord]:
        from nvs.pipeline.extract import read_all_records

        return [
            record
            for record in read_all_records(self.settings)
            if record.source == "trails" and "geometry" in record.payload
        ]

    def _lookup(self, points: list[list[float]]) -> list[float]:
        locations = "|".join(f"{lat},{lng}" for lat, lng in points)
        data = self.client.get(self._api(), params={"locations": locations}).json()
        return [
            float(result["elevation"])
            for result in data.get("results", [])
            if result.get("elevation") is not None
        ]

    def fetch(self) -> Iterator[SourceRecord]:
        for record in self._trail_records():
            points = sample_points(record.payload["geometry"])
            if len(points) < 2:
                continue
            elevations = self._lookup(points)
            if len(elevations) < 2:
                continue
            yield SourceRecord(
                source=self.name,
                source_id=record.source_id,
                source_url=record.source_url,
                license=self.license,
                attribution=self.attribution,
                payload={
                    "trail_source_id": record.source_id,
                    "elevation_gain_m": elevation_gain(elevations),
                    "min_elevation_m": int(round(min(elevations))),
                    "max_elevation_m": int(round(max(elevations))),
                },
            )

    def plan(self) -> list[str]:
        return [
            f"GET  {self._api()} locations=lat,lng|... (<= {MAX_POINTS} sampled points/trail)",
            "source: raw overpass trail geometry; gain from positive deltas (>5 m)",
        ]
