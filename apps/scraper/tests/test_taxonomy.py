from __future__ import annotations

from nvs.core.models import PlaceType
from nvs.core.taxonomy import map_category, trust_rank


def test_osm_hotel_maps_to_lodging() -> None:
    assert map_category("osm", {"tourism": "hotel"}) == PlaceType.LODGING


def test_osm_restaurant_maps_to_restaurant() -> None:
    assert map_category("osm", {"amenity": "restaurant"}) == PlaceType.RESTAURANT


def test_osm_cafe_and_bar() -> None:
    assert map_category("osm", {"amenity": "cafe"}) == PlaceType.CAFE
    assert map_category("osm", {"amenity": "bar"}) == PlaceType.BAR


def test_osm_historic_maps_to_heritage() -> None:
    assert map_category("osm", {"historic": "temple"}) == PlaceType.HERITAGE
    assert map_category("osm", {"heritage": "1", "historic": "ruins"}) == PlaceType.HERITAGE


def test_osm_leisure_park_maps_to_park() -> None:
    assert map_category("osm", {"leisure": "park"}) == PlaceType.PARK


def test_osm_place_of_worship_maps_to_temple() -> None:
    assert map_category("osm", {"amenity": "place_of_worship", "religion": "hindu"}) == (
        PlaceType.TEMPLE
    )


def test_osm_guest_house_maps_to_guesthouse() -> None:
    assert map_category("osm", {"tourism": "guest_house"}) == PlaceType.GUESTHOUSE


def test_osm_peak_and_waterfall() -> None:
    assert map_category("osm", {"natural": "peak"}) == PlaceType.PEAK
    assert map_category("osm", {"natural": "waterfall"}) == PlaceType.WATERFALL


def test_osm_route_hiking_maps_to_trekking_route() -> None:
    assert map_category("osm", {"route": "hiking"}) == PlaceType.TREKKING_ROUTE


def test_osm_museum_and_viewpoint() -> None:
    assert map_category("osm", {"tourism": "museum"}) == PlaceType.MUSEUM
    assert map_category("osm", {"tourism": "viewpoint"}) == PlaceType.VIEWPOINT


def test_unknown_tags_default_to_other() -> None:
    assert map_category("osm", {"random": "value"}) == PlaceType.OTHER
    assert map_category("unknown_source", {"tourism": "hotel"}) == PlaceType.OTHER


def test_wikivoyage_sections() -> None:
    assert map_category("wikivoyage", {"section": "Sleep around"}) == PlaceType.LODGING
    assert map_category("wikivoyage", {"section": "Eat"}) == PlaceType.RESTAURANT
    assert map_category("wikivoyage", {"section": "See"}) == PlaceType.ATTRACTION
    assert map_category("wikivoyage", {"section": "Buy"}) == PlaceType.SHOP


def test_wikidata_instance_of() -> None:
    assert map_category("wikidata", {"instance_of": ["museum"]}) == PlaceType.MUSEUM
    assert map_category(
        "wikidata", {"instance_of": ["Hindu temple"]}
    ) == PlaceType.TEMPLE
    assert map_category("wikidata", {"instance_of": ["mountain"]}) == PlaceType.PEAK


def test_trust_order() -> None:
    assert trust_rank("wikidata") < trust_rank("osm") < trust_rank("wikivoyage")
    assert trust_rank("osm") < trust_rank("google") < trust_rank("other")
    assert trust_rank("mystery") > trust_rank("other")
