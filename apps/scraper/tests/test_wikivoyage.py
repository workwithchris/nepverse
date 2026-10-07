from __future__ import annotations

from nvs.sources.wikivoyage import parse_listings

WIKITEXT = """
'''Kathmandu''' is the capital.

== See ==
* {{see
| name=Boudhanath Stupa | alt= | url= | email=
| address= | lat=27.7215 | long=85.3620 | directions=
| phone= | tollfree=
| hours= | price=
| wikidata=Q204467
| content=A massive Buddhist stupa.
}}
{{eat
| name=Thamel House | lat=27.7153 | long=85.3122 | content=Newari food.
}}
{{sleep|name=Hotel Yak |lat=27.705 |long=85.315 |price=Rs 5000}}
{{listing|type=buy|name=Book Shop|lat=27.71|long=85.31}}
{{see|name=No Coords Place|content=skip me}}
"""


def test_parse_listings_finds_templates() -> None:
    listings = parse_listings(WIKITEXT)
    names = {listing["name"] for listing in listings}
    assert {"Boudhanath Stupa", "Thamel House", "Hotel Yak", "Book Shop"} <= names


def test_parse_listings_sections_and_coords() -> None:
    listings = {listing["name"]: listing for listing in parse_listings(WIKITEXT)}
    stupa = listings["Boudhanath Stupa"]
    assert stupa["section"] == "see"
    assert stupa["lat"] == "27.7215"
    assert stupa["lng"] == "85.3620"
    assert stupa["wikidata"] == "Q204467"
    assert "stupa" in stupa["description"]
    assert listings["Hotel Yak"]["section"] == "sleep"
    assert listings["Book Shop"]["section"] == "buy"


def test_parse_listings_ignores_non_listing_templates() -> None:
    text = "{{infobox|name=x}}{{other|name=y}}"
    assert parse_listings(text) == []
