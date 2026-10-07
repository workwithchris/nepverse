from __future__ import annotations

from nvs.core.dedupe import dedupe
from nvs.core.models import Place, Trail


def resolve(places: list[Place], radius_m: float = 75, threshold: float = 88) -> list[Place]:
    return dedupe(places, radius_m=radius_m, threshold=threshold)


def resolve_trails(trails: list[Trail]) -> list[Trail]:
    # TODO(M3): geo-cluster trail heads + name fuzzy match once PostGIS is available
    seen: dict[str, Trail] = {}
    for trail in trails:
        if trail.id in seen:
            continue
        seen[trail.id] = trail
    return list(seen.values())
