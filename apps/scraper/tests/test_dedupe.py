from __future__ import annotations

from nvs.core.dedupe import dedupe, haversine_m
from nvs.core.models import Place, PlaceType


def _place(
    pid: str,
    name: str,
    lat: float,
    lng: float,
    source: str,
    **kwargs,
) -> Place:
    return Place(
        id=pid,
        name_en=name,
        lat=lat,
        lng=lng,
        source_ids={source: pid},
        license=kwargs.pop("license", "test"),
        attribution=kwargs.pop("attribution", "test"),
        **kwargs,
    )


def test_haversine_known_distance() -> None:
    dist = haversine_m(27.7172, 85.3240, 27.7177, 85.3240)
    assert 40 < dist < 70


def test_haversine_zero_for_same_point() -> None:
    assert haversine_m(27.0, 85.0, 27.0, 85.0) == 0.0


def test_two_places_50m_apart_with_similar_names_merge() -> None:
    a = _place("nv_a", "Hotel Yak & Yeti", 27.7050, 85.3150, "osm")
    b = _place("nv_b", "Yak Yeti Hotel", 27.7054, 85.3150, "wikivoyage")
    merged = dedupe([a, b], radius_m=75, threshold=88)
    assert len(merged) == 1
    assert set(merged[0].source_ids) == {"osm", "wikivoyage"}


def test_places_far_apart_do_not_merge() -> None:
    a = _place("nv_a", "Hotel Yak Yeti", 27.7050, 85.3150, "osm")
    b = _place("nv_b", "Hotel Yak Yeti", 27.7172, 85.3240, "wikivoyage")
    merged = dedupe([a, b], radius_m=75, threshold=88)
    assert len(merged) == 2


def test_similar_names_but_out_of_radius_do_not_merge() -> None:
    a = _place("nv_a", "Everest Hotel", 27.7100, 85.3100, "osm")
    b = _place("nv_b", "Everest Hotel", 27.7109, 85.3100, "wikivoyage")
    merged = dedupe([a, b], radius_m=75, threshold=88)
    assert len(merged) == 2


def test_different_names_close_together_do_not_merge() -> None:
    a = _place("nv_a", "Boudhanath Stupa", 27.7215, 85.3620, "osm")
    b = _place("nv_b", "Cafe Swotha", 27.7218, 85.3620, "wikivoyage")
    merged = dedupe([a, b], radius_m=75, threshold=88)
    assert len(merged) == 2


def test_higher_trust_source_wins_field_filling() -> None:
    low = _place(
        "nv_low",
        "Chitwan National Park",
        27.5291,
        84.3542,
        "wikivoyage",
        description="",
        rating=None,
    )
    high = _place(
        "nv_high",
        "Chitwan National Park",
        27.5293,
        84.3542,
        "wikidata",
        description="Protected area in Nepal",
        rating=4.7,
    )
    merged = dedupe([low, high], radius_m=75, threshold=88)
    assert len(merged) == 1
    assert merged[0].description == "Protected area in Nepal"
    assert merged[0].rating == 4.7
    assert set(merged[0].source_ids) == {"wikivoyage", "wikidata"}


def test_place_type_upgraded_from_other() -> None:
    low = _place("nv_1", "Swayambhunath", 27.7149, 85.2903, "wikivoyage")
    high = _place(
        "nv_2",
        "Swayambhunath",
        27.7150,
        85.2903,
        "osm",
        place_type=PlaceType.TEMPLE,
    )
    merged = dedupe([low, high], radius_m=75, threshold=88)
    assert len(merged) == 1
    assert merged[0].place_type == PlaceType.TEMPLE


def test_three_way_cluster_merges_to_one() -> None:
    places = [
        _place("nv_1", "Thamel House", 27.7150, 85.3120, "osm"),
        _place("nv_2", "Thamel House Restaurant", 27.7153, 85.3122, "wikivoyage"),
        _place("nv_3", "Thamel House", 27.7151, 85.3121, "wikidata"),
    ]
    merged = dedupe(places, radius_m=75, threshold=88)
    assert len(merged) == 1
    assert len(merged[0].source_ids) == 3
