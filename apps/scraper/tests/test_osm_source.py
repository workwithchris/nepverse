from __future__ import annotations

from nvs.config import Settings
from nvs.core.models import RawBatch, SourceRecord
from nvs.pipeline.extract import read_records, write_batch
from nvs.sources.osm import poi_payload


def test_poi_payload_prefers_english_name() -> None:
    payload = poi_payload(
        {"name": "स्वयम्भूनाथ", "name:en": "Swayambhunath", "name:ne": "स्वयम्भूनाथ"},
        element_id="node/1",
        osm_type="node",
        lat=27.7149,
        lng=85.2903,
    )
    assert payload["name_en"] == "Swayambhunath"
    assert payload["name_ne"] == "स्वयम्भूनाथ"
    assert payload["lat"] == 27.7149
    assert payload["lng"] == 85.2903


def test_poi_payload_falls_back_to_name_tag() -> None:
    payload = poi_payload(
        {"name": "Thamel House"}, element_id="node/2", osm_type="node", lat=1.0, lng=2.0
    )
    assert payload["name_en"] == "Thamel House"
    assert payload["name_ne"] is None


def test_poi_payload_builds_address_and_extras() -> None:
    payload = poi_payload(
        {
            "name": "Cafe",
            "addr:housenumber": "12",
            "addr:street": "Thamel Marg",
            "addr:city": "Kathmandu",
            "opening_hours": "Mo-Su 08:00-20:00",
            "wikidata": "Q123",
            "website": "https://example.com",
        },
        element_id="way/9",
        osm_type="way",
        lat=27.7,
        lng=85.3,
    )
    assert payload["address"] == "Thamel Marg 12 Kathmandu"
    assert payload["opening_hours"] == "Mo-Su 08:00-20:00"
    assert payload["wikidata_id"] == "Q123"
    assert payload["website"] == "https://example.com"


def test_write_batch_is_idempotent(tmp_path) -> None:
    settings = Settings({})
    settings.raw_dir = tmp_path
    record = SourceRecord(source="osm", source_id="node/1", payload={"name": "x"})
    batch = RawBatch(source="osm", records=[record])

    write_batch(batch, settings)
    write_batch(batch, settings)

    assert len(read_records("osm", settings)) == 1
