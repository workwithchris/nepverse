from __future__ import annotations

from nvs.core.models import Place, PlaceType, Trail
from nvs.storage.db import place_row, source_rows, trail_row


def _place(**kwargs) -> Place:
    return Place(
        id="nv_1",
        name_en="Swayambhunath",
        place_type=PlaceType.TEMPLE,
        lat=27.7149,
        lng=85.2903,
        source_ids={"osm": "node/1", "wikidata": "Q1"},
        license="ODbL-1.0",
        attribution="© OpenStreetMap contributors",
        **kwargs,
    )


def test_place_row_maps_core_fields() -> None:
    row = place_row(_place())
    assert row["id"] == "nv_1"
    assert row["place_type"] == "temple"
    assert row["lat"] == 27.7149
    assert row["image_url"] is None


def test_place_row_attaches_media() -> None:
    row = place_row(_place(), {"image_url": "https://x/y.jpg", "license": "CC BY-SA 4.0"})
    assert row["image_url"] == "https://x/y.jpg"
    assert row["image_license"] == "CC BY-SA 4.0"


def test_source_rows_one_per_source() -> None:
    rows = source_rows(_place())
    assert {r["source"] for r in rows} == {"osm", "wikidata"}
    assert all(r["place_id"] == "nv_1" for r in rows)


def test_trail_row_maps_geometry() -> None:
    trail = Trail(id="nv_t", name="ABC Trek", geometry=[[27.0, 85.0], [27.1, 85.1]])
    row = trail_row(trail)
    assert row["name"] == "ABC Trek"
    assert row["geometry"] == [[27.0, 85.0], [27.1, 85.1]]
