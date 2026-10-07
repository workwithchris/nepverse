from __future__ import annotations

import hashlib

from nvs.core.models import Place, SourceRecord
from nvs.core.normalize import clamp_coords, is_valid_name, normalize_name
from nvs.core.taxonomy import map_category


def place_id(*parts: str) -> str:
    digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()
    return f"nv_{digest[:16]}"


def record_to_place(record: SourceRecord) -> Place | None:
    payload = dict(record.payload)
    lat = payload.get("lat")
    lng = payload.get("lng")
    coords = clamp_coords(
        float(lat) if lat is not None else None,
        float(lng) if lng is not None else None,
    )
    if coords is None:
        return None
    name_en = str(payload.get("name_en") or payload.get("name") or "").strip()
    if not is_valid_name(name_en):
        return None
    name_ne = payload.get("name_ne")
    tags = payload.get("tags") or []
    if isinstance(tags, dict):
        tags = [f"{k}={v}" for k, v in tags.items()]
    place = Place(
        id=place_id(record.source, record.source_id),
        name_en=name_en,
        name_ne=str(name_ne) if name_ne else None,
        place_type=map_category(record.source, payload.get("tags") or payload),
        lat=coords[0],
        lng=coords[1],
        address=payload.get("address"),
        opening_hours=payload.get("opening_hours"),
        price_level=payload.get("price_level"),
        rating=payload.get("rating"),
        review_count=payload.get("review_count"),
        description=payload.get("description"),
        tags=[str(t) for t in tags],
        wikidata_id=payload.get("wikidata_id"),
        source_ids={record.source: record.source_id},
        license=record.license,
        attribution=record.attribution,
        source_url=record.source_url,
    )
    place.name_en = name_en
    return place


def normalize_records(records: list[SourceRecord]) -> list[Place]:
    places: list[Place] = []
    for record in records:
        place = record_to_place(record)
        if place is not None:
            places.append(place)
    return places


def normalized_key(place: Place) -> str:
    return normalize_name(place.name_en)
