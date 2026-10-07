from __future__ import annotations

import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from nvs.config import Settings, load_settings
from nvs.core.models import Place, PlaceType, Trail
from nvs.pipeline.extract import read_all_records
from nvs.pipeline.normalize import normalize_records
from nvs.pipeline.resolve import resolve, resolve_trails
from nvs.pipeline.trails import build_trails

# Canonical scraper taxonomy -> the 10 types the web viewer understands.
# Types absent here are not viewer-relevant (shops, banks, toilets...) and are dropped.
WEB_PLACE_TYPES: dict[PlaceType, str] = {
    PlaceType.HERITAGE: "heritage",
    PlaceType.TEMPLE: "heritage",
    PlaceType.MUSEUM: "heritage",
    PlaceType.PARK: "park",
    PlaceType.PROTECTED_AREA: "park",
    PlaceType.VIEWPOINT: "viewpoint",
    PlaceType.ATTRACTION: "attraction",
    PlaceType.WATERFALL: "attraction",
    PlaceType.PEAK: "attraction",
    PlaceType.RESTAURANT: "restaurant",
    PlaceType.STREET_FOOD: "street_food",
    PlaceType.CAFE: "cafe",
    PlaceType.BAR: "restaurant",
    PlaceType.LODGING: "lodging",
    PlaceType.GUESTHOUSE: "lodging",
    PlaceType.HOMESTAY: "homestay",
    PlaceType.TRAIL: "trailhead",
    PlaceType.TREKKING_ROUTE: "trailhead",
}


def to_web_place(place: Place, media: dict[str, dict[str, Any]] | None = None) -> dict[str, Any] | None:
    web_type = WEB_PLACE_TYPES.get(place.place_type)
    if web_type is None:
        return None
    image = media.get(place.wikidata_id) if media and place.wikidata_id else None
    return {
        "id": place.id,
        "nameEn": place.name_en,
        "nameNe": place.name_ne,
        "placeType": web_type,
        "lat": place.lat,
        "lng": place.lng,
        "address": place.address,
        "openingHours": place.opening_hours,
        "priceLevel": place.price_level,
        "rating": place.rating,
        "reviewCount": place.review_count,
        "description": place.description,
        "tags": place.tags,
        "wikidataId": place.wikidata_id,
        "imageUrl": image.get("image_url") if image else None,
        "imagePageUrl": image.get("page_url") if image else None,
        "imageLicense": image.get("license") if image else None,
        "imageLicenseUrl": image.get("license_url") if image else None,
        "imageAuthor": image.get("author") if image else None,
        "imageAttribution": image.get("attribution") if image else None,
        "status": place.status.value,
        "sources": [
            {
                "source": source,
                "url": place.source_url,
                "license": place.license,
                "attribution": place.attribution,
            }
            for source in place.source_ids
        ],
    }


def to_web_trail(trail: Trail) -> dict[str, Any]:
    return {
        "id": trail.id,
        "name": trail.name,
        "distanceKm": round(trail.distance_km or 0.0, 1),
        "elevationGainM": trail.elevation_gain_m,
        "difficulty": trail.difficulty or "moderate",
        "bestSeason": trail.best_season or "Oct–Nov, Mar–May",
        "permitRequired": bool(trail.permit_required),
        "days": trail.days,
        "description": trail.description,
        "geometry": [[lng, lat] for lat, lng in trail.geometry],
    }


def build_stats(places: list[Place], trails: list[Trail]) -> dict:
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "places": len(places),
        "trails": len(trails),
        "by_type": dict(Counter(p.place_type.value for p in places)),
        "by_source": dict(Counter(s for p in places for s in p.source_ids)),
        "with_rating": sum(1 for p in places if p.rating is not None),
        "with_photos": sum(1 for p in places if p.wikidata_id),
    }


def _page(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {"items": items, "total": len(items), "page": 1, "pageSize": len(items)}


def _web_stats(web_places: list[dict[str, Any]], trails: list[Trail]) -> dict[str, Any]:
    ratings = [p["rating"] for p in web_places if p["rating"] is not None]
    return {
        "totalPlaces": len(web_places),
        "totalTrails": len(trails),
        "byType": dict(Counter(p["placeType"] for p in web_places)),
        "avgRating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        "generatedAt": datetime.now(UTC).isoformat(),
    }


def write_export(
    out_dir: Path | str,
    places: list[Place],
    trails: list[Trail],
    fmt: str = "json",
    media: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Path]:
    if fmt != "json":
        raise ValueError(f"unsupported export format: {fmt} (only json is implemented)")
    target = Path(out_dir)
    target.mkdir(parents=True, exist_ok=True)
    web_places = [
        item for place in places if (item := to_web_place(place, media)) is not None
    ]
    web_trails = [to_web_trail(trail) for trail in trails]
    paths = {
        "places": target / "places.json",
        "trails": target / "trails.json",
        "stats": target / "stats.json",
    }
    payloads = {
        "places": _page(web_places),
        "trails": _page(web_trails),
        "stats": _web_stats(web_places, trails),
    }
    for label, path in paths.items():
        path.write_text(
            json.dumps(payloads[label], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return paths


def build_dataset(
    settings: Settings | None = None,
    *,
    dedupe_enabled: bool = True,
    limit: int | None = None,
) -> tuple[list[Place], list[Trail], dict[str, dict[str, Any]]]:
    """Derive canonical places, trails and media map from the raw layer."""
    settings = settings or load_settings()
    records = read_all_records(settings)
    place_records = [
        r for r in records if "geometry" not in r.payload and r.source not in {"elevation", "commons"}
    ]
    media = {
        str(r.payload["wikidata_id"]): r.payload
        for r in records
        if r.source == "commons" and r.payload.get("wikidata_id")
    }
    places = normalize_records(place_records)
    if dedupe_enabled:
        places = resolve(places)
    if limit is not None:
        places = places[:limit]
    trails = resolve_trails(build_trails(records))
    return places, trails, media


def export_from_raw(
    out_dir: Path | str,
    settings: Settings | None = None,
    *,
    dedupe_enabled: bool = True,
    limit: int | None = None,
) -> dict[str, Path]:
    places, trails, media = build_dataset(
        settings, dedupe_enabled=dedupe_enabled, limit=limit
    )
    return write_export(out_dir, places, trails, media=media)
