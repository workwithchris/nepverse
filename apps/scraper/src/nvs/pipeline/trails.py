from __future__ import annotations

from nvs.core.dedupe import haversine_m
from nvs.core.models import SourceRecord, Trail
from nvs.pipeline.normalize import place_id

RESTRICTED_KEYWORDS = ("manaslu", "mustang", "dolpo", "kanchenjunga", "t-sum", "tsum")
BEST_SEASON = "Oct–Nov, Mar–May"
CHAIN_TOLERANCE_M = 300.0


def _dedupe_points(points: list[list[float]]) -> list[list[float]]:
    out: list[list[float]] = []
    for point in points:
        if not out or out[-1] != point:
            out.append(point)
    return out


def chain_segments(segments: list[list[list[float]]], tol_m: float = CHAIN_TOLERANCE_M) -> list[list[list[float]]]:
    """Join OSM member ways into ordered polylines by matching endpoints."""
    remaining = [seg for seg in (_dedupe_points(s) for s in segments) if len(seg) >= 2]
    chains: list[list[list[float]]] = []
    while remaining:
        chain = list(remaining.pop(0))
        extended = True
        while extended:
            extended = False
            for index, seg in enumerate(remaining):
                if haversine_m(*chain[-1], *seg[0]) <= tol_m:
                    chain.extend(seg[1:])
                elif haversine_m(*chain[-1], *seg[-1]) <= tol_m:
                    chain.extend(list(reversed(seg))[1:])
                elif haversine_m(*chain[0], *seg[-1]) <= tol_m:
                    chain = seg[:-1] + chain
                elif haversine_m(*chain[0], *seg[0]) <= tol_m:
                    chain = list(reversed(seg))[:-1] + chain
                else:
                    continue
                remaining.pop(index)
                extended = True
                break
        chains.append(chain)
    return chains


def longest_chain(segments: list[list[list[float]]]) -> list[list[float]]:
    chains = chain_segments(segments)
    if not chains:
        return []
    return max(chains, key=len)


def _distance_km(geometry: list[list[float]]) -> float:
    total = 0.0
    for (lat1, lng1), (lat2, lng2) in zip(geometry, geometry[1:], strict=False):
        total += haversine_m(lat1, lng1, lat2, lng2)
    return round(total / 1000.0, 1)


def _difficulty(distance_km: float, gain_m: float | None) -> str:
    gain = gain_m or 0
    if distance_km < 10 and gain < 400:
        return "easy"
    if distance_km < 25 and gain < 1200:
        return "moderate"
    if distance_km < 50 and gain < 2500:
        return "hard"
    return "extreme"


def record_to_trail(record: SourceRecord, elevation_gain_m: int | None = None) -> Trail | None:
    payload = record.payload
    geometry = payload.get("geometry") or []
    name = str(payload.get("name_en") or "").strip()
    if not name or len(geometry) < 2:
        return None
    distance_km = _distance_km(geometry)
    if distance_km <= 0:
        return None
    lowered = name.lower()
    return Trail(
        id=place_id(record.source, record.source_id),
        name=name,
        geometry=geometry,
        distance_km=distance_km,
        elevation_gain_m=elevation_gain_m,
        difficulty=_difficulty(distance_km, elevation_gain_m),
        best_season=BEST_SEASON,
        permit_required=any(keyword in lowered for keyword in RESTRICTED_KEYWORDS),
        days=max(1, round(distance_km / 15)),
        description=payload.get("description"),
        license=record.license,
        attribution=record.attribution,
        source_url=record.source_url,
        source_ids={record.source: record.source_id},
    )


def elevation_map(records: list[SourceRecord]) -> dict[str, int]:
    """trail source_id -> elevation gain, from elevation-source records."""
    out: dict[str, int] = {}
    for record in records:
        if record.source != "elevation":
            continue
        trail_id = record.payload.get("trail_source_id")
        gain = record.payload.get("elevation_gain_m")
        if trail_id and gain is not None:
            out[str(trail_id)] = int(gain)
    return out


def build_trails(records: list[SourceRecord]) -> list[Trail]:
    gains = elevation_map(records)
    trails: list[Trail] = []
    for record in records:
        if "geometry" not in record.payload:
            continue
        trail = record_to_trail(record, elevation_gain_m=gains.get(record.source_id))
        if trail is not None:
            trails.append(trail)
    return trails
