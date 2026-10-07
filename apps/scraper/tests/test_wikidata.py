from __future__ import annotations

from nvs.sources.wikidata import _coord, _qid, bindings_to_records


def test_coord_parses_wkt_point() -> None:
    assert _coord("Point(85.3240 27.7172)") == (27.7172, 85.3240)
    assert _coord("nonsense") is None


def test_qid_extracts_from_uri() -> None:
    assert _qid("http://www.wikidata.org/entity/Q1234") == "Q1234"
    assert _qid("") is None


def test_bindings_group_multiple_instance_of() -> None:
    bindings = [
        {
            "item": {"value": "http://www.wikidata.org/entity/Q1"},
            "itemLabel": {"value": "Swayambhunath"},
            "coord": {"value": "Point(85.29 27.7149)"},
            "instanceOfLabel": {"value": "temple"},
        },
        {
            "item": {"value": "http://www.wikidata.org/entity/Q1"},
            "itemLabel": {"value": "Swayambhunath"},
            "coord": {"value": "Point(85.29 27.7149)"},
            "instanceOfLabel": {"value": "stupa"},
            "heritageLabel": {"value": "UNESCO World Heritage Site"},
        },
    ]
    records = bindings_to_records(bindings)
    assert len(records) == 1
    assert records[0]["qid"] == "Q1"
    assert records[0]["instance_of"] == {"temple", "stupa"}
    assert records[0]["heritage"] == {"UNESCO World Heritage Site"}
    assert records[0]["coord"] == (27.7149, 85.29)
