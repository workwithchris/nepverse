from __future__ import annotations

import math
from collections.abc import Iterable

from rapidfuzz import fuzz

from nvs.core.models import Place
from nvs.core.normalize import normalize_name
from nvs.core.taxonomy import trust_rank

EARTH_RADIUS_M = 6371008.8
METERS_PER_DEG_LAT = 111_320.0


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def duplicate_rate(before: int, after: int) -> float:
    """Fraction of input places that collapsed during resolution."""
    return 0.0 if before == 0 else (before - after) / before


def _fill(target: Place, other: Place) -> Place:
    merged = target.model_copy(deep=True)
    fields = (
        "name_ne",
        "address",
        "opening_hours",
        "price_level",
        "rating",
        "review_count",
        "description",
        "wikidata_id",
        "source_url",
        "status",
    )
    for field in fields:
        if getattr(merged, field) in (None, "", 0) and getattr(other, field) not in (None, "", 0):
            setattr(merged, field, getattr(other, field))
    if not merged.tags:
        merged.tags = list(other.tags)
    if merged.place_type.value == "other" and other.place_type.value != "other":
        merged.place_type = other.place_type
    merged.source_ids.update(other.source_ids)
    merged.updated_at = max(merged.updated_at, other.updated_at)
    return merged


def _pick(a: Place, b: Place) -> tuple[Place, Place]:
    a_rank = min((trust_rank(s.split(":", 1)[0]) for s in a.source_ids), default=99)
    b_rank = min((trust_rank(s.split(":", 1)[0]) for s in b.source_ids), default=99)
    if a_rank <= b_rank:
        return a, b
    return b, a


def _cell(lat: float, lng: float, size: float) -> tuple[int, int]:
    return (math.floor(lat / size), math.floor(lng / size))


def _lng_reach(lat: float, radius_m: float, size: float) -> int:
    """Number of grid cells to scan sideways to cover ``radius_m`` at this latitude."""
    cell_m = size * METERS_PER_DEG_LAT * max(math.cos(math.radians(lat)), 0.01)
    return max(1, math.ceil(radius_m / cell_m)) + 1


def dedupe(
    places: Iterable[Place], radius_m: float = 75, threshold: float = 88
) -> list[Place]:
    """Greedy spatial dedupe, blocked by a ~radius-sized lat/lng grid (avoids O(n^2))."""
    items = list(places)
    size = radius_m / METERS_PER_DEG_LAT
    buckets: dict[tuple[int, int], list[Place]] = {}
    for place in items:
        buckets.setdefault(_cell(place.lat, place.lng, size), []).append(place)

    consumed: set[int] = set()
    merged_out: list[Place] = []
    for seed in items:
        if id(seed) in consumed:
            continue
        consumed.add(id(seed))
        row, col = _cell(seed.lat, seed.lng, size)
        reach = _lng_reach(seed.lat, radius_m, size)
        cluster = [seed]
        for dr in (-1, 0, 1):
            for dc in range(-reach, reach + 1):
                for candidate in buckets.get((row + dr, col + dc), ()):
                    if id(candidate) in consumed:
                        continue
                    if haversine_m(seed.lat, seed.lng, candidate.lat, candidate.lng) > radius_m:
                        continue
                    score = fuzz.token_set_ratio(
                        normalize_name(seed.name_en), normalize_name(candidate.name_en)
                    )
                    if score >= threshold:
                        consumed.add(id(candidate))
                        cluster.append(candidate)
        if len(cluster) == 1:
            merged_out.append(seed)
            continue
        cluster_sorted = sorted(
            cluster,
            key=lambda p: min((trust_rank(s.split(":", 1)[0]) for s in p.source_ids), default=99),
        )
        winner = cluster_sorted[0]
        for other in cluster_sorted[1:]:
            primary, secondary = _pick(winner, other)
            winner = _fill(primary, secondary)
        merged_out.append(winner)
    return merged_out
