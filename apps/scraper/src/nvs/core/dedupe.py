from __future__ import annotations

import math
from collections.abc import Iterable

from rapidfuzz import fuzz

from nvs.core.models import Place
from nvs.core.normalize import normalize_name
from nvs.core.taxonomy import trust_rank

EARTH_RADIUS_M = 6371008.8


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


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


def dedupe(
    places: Iterable[Place], radius_m: float = 75, threshold: float = 88
) -> list[Place]:
    remaining = list(places)
    merged_out: list[Place] = []
    while remaining:
        seed = remaining.pop(0)
        cluster = [seed]
        kept: list[Place] = []
        for candidate in remaining:
            dist = haversine_m(seed.lat, seed.lng, candidate.lat, candidate.lng)
            if dist > radius_m:
                kept.append(candidate)
                continue
            score = fuzz.token_set_ratio(
                normalize_name(seed.name_en), normalize_name(candidate.name_en)
            )
            if score >= threshold:
                cluster.append(candidate)
            else:
                kept.append(candidate)
        remaining = kept
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
