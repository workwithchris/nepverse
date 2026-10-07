from __future__ import annotations

from nvs.core.models import SourceRecord
from nvs.pipeline.trails import (
    build_trails,
    chain_segments,
    longest_chain,
    record_to_trail,
)


def test_chain_segments_orders_by_endpoints() -> None:
    a = [[0.0, 0.0], [0.0, 0.01]]
    b = [[0.0, 0.01], [0.0, 0.02]]
    c = [[0.0, 0.02], [0.0, 0.03]]
    chains = chain_segments([c, a, b])
    assert len(chains) == 1
    assert len(chains[0]) == 4


def test_chain_segments_handles_reversed_member() -> None:
    a = [[0.0, 0.0], [0.0, 0.01]]
    reversed_b = [[0.0, 0.02], [0.0, 0.01]]
    chain = longest_chain([a, reversed_b])
    assert chain[0] == [0.0, 0.0]
    assert chain[-1] == [0.0, 0.02]


def test_longest_chain_prefers_longest_group() -> None:
    short = [[0.0, 0.0], [0.0, 0.01]]
    long = [[1.0, 1.0], [1.0, 1.01], [1.0, 1.02]]
    assert len(longest_chain([short, long])) == 3


def test_chain_segments_removes_jump_inflation() -> None:
    # Two far-apart groups must not be summed as one continuous line.
    left = [[27.0, 85.0], [27.0, 85.01]]
    right = [[28.0, 86.0], [28.0, 86.01]]
    chains = chain_segments([left, right])
    assert len(chains) == 2


def _record(name: str, geometry: list[list[float]]) -> SourceRecord:
    return SourceRecord(
        source="overpass",
        source_id="relation/1",
        payload={"name_en": name, "geometry": geometry},
    )


def test_record_to_trail_computes_distance_and_difficulty() -> None:
    trail = record_to_trail(
        _record("Short Walk", [[27.700, 85.300], [27.710, 85.310], [27.720, 85.320]])
    )
    assert trail is not None
    assert trail.distance_km > 0
    assert trail.difficulty == "easy"
    assert trail.days == 1
    assert trail.permit_required is False


def test_difficulty_uses_elevation_gain() -> None:
    flat = record_to_trail(_record("Flat", [[27.70, 85.30], [27.72, 85.32]]), elevation_gain_m=100)
    steep = record_to_trail(_record("Steep", [[27.70, 85.30], [27.72, 85.32]]), elevation_gain_m=1800)
    assert flat is not None and steep is not None
    assert flat.difficulty == "easy"
    assert steep.difficulty in {"hard", "extreme"}


def test_build_trails_applies_elevation_records() -> None:
    trail_record = _record("Trek", [[27.70, 85.30], [27.71, 85.31]])
    elevation_record = SourceRecord(
        source="elevation",
        source_id="relation/1",
        payload={"trail_source_id": "relation/1", "elevation_gain_m": 900},
    )
    trails = build_trails([trail_record, elevation_record])
    assert len(trails) == 1
    assert trails[0].elevation_gain_m == 900


def test_restricted_trail_requires_permit() -> None:
    trail = record_to_trail(
        _record("Manaslu Circuit", [[28.0, 84.5], [28.1, 84.6], [28.2, 84.7]])
    )
    assert trail is not None
    assert trail.permit_required is True


def test_record_without_geometry_is_ignored() -> None:
    assert record_to_trail(SourceRecord(source="overpass", source_id="x", payload={})) is None
    assert build_trails([SourceRecord(source="osm", source_id="y", payload={"name_en": "P"})]) == []
