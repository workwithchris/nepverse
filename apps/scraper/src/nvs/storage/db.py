from __future__ import annotations

import os
from collections.abc import Iterable
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
)
from sqlalchemy.engine import Engine

from nvs.core.models import Place, Trail

DEFAULT_URL = "postgresql+psycopg://nepalverse:nepalverse@localhost:5432/nepalverse"

metadata = MetaData()

places = Table(
    "places",
    metadata,
    Column("id", String(64), primary_key=True),
    Column("name_en", Text, nullable=False),
    Column("name_ne", Text),
    Column("place_type", String(32), nullable=False),
    Column("lat", Float, nullable=False),
    Column("lng", Float, nullable=False),
    Column("address", Text),
    Column("opening_hours", Text),
    Column("price_level", Integer),
    Column("rating", Float),
    Column("review_count", Integer),
    Column("description", Text),
    Column("tags", JSON),
    Column("wikidata_id", String(32)),
    Column("image_url", Text),
    Column("image_page_url", Text),
    Column("image_license", Text),
    Column("image_license_url", Text),
    Column("image_author", Text),
    Column("image_attribution", Text),
    Column("license", Text),
    Column("attribution", Text),
    Column("source_url", Text),
    Column("status", String(16)),
    Column("created_at", DateTime(timezone=True)),
    Column("updated_at", DateTime(timezone=True)),
)

place_sources = Table(
    "place_sources",
    metadata,
    Column("place_id", String(64), ForeignKey("places.id", ondelete="CASCADE"), primary_key=True),
    Column("source", String(32), primary_key=True),
    Column("source_id", String(64), nullable=False),
    Column("source_url", Text),
    Column("license", Text),
    Column("fetched_at", DateTime(timezone=True)),
)

trails = Table(
    "trails",
    metadata,
    Column("id", String(64), primary_key=True),
    Column("name", Text, nullable=False),
    Column("geometry", JSON),
    Column("distance_km", Float),
    Column("elevation_gain_m", Integer),
    Column("difficulty", String(16)),
    Column("best_season", Text),
    Column("permit_required", Boolean),
    Column("days", Integer),
    Column("description", Text),
    Column("license", Text),
    Column("attribution", Text),
    Column("source_url", Text),
    Column("source_ids", JSON),
    Column("created_at", DateTime(timezone=True)),
    Column("updated_at", DateTime(timezone=True)),
)


def get_engine(url: str | None = None) -> Engine:
    return create_engine(url or os.environ.get("DATABASE_URL", DEFAULT_URL), future=True)


def init_db(engine: Engine) -> None:
    metadata.create_all(engine)


def place_row(place: Place, image: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "id": place.id,
        "name_en": place.name_en,
        "name_ne": place.name_ne,
        "place_type": place.place_type.value,
        "lat": place.lat,
        "lng": place.lng,
        "address": place.address,
        "opening_hours": place.opening_hours,
        "price_level": place.price_level,
        "rating": place.rating,
        "review_count": place.review_count,
        "description": place.description,
        "tags": place.tags,
        "wikidata_id": place.wikidata_id,
        "image_url": image.get("image_url") if image else None,
        "image_page_url": image.get("page_url") if image else None,
        "image_license": image.get("license") if image else None,
        "image_license_url": image.get("license_url") if image else None,
        "image_author": image.get("author") if image else None,
        "image_attribution": image.get("attribution") if image else None,
        "license": place.license,
        "attribution": place.attribution,
        "source_url": place.source_url,
        "status": place.status.value,
        "created_at": place.created_at,
        "updated_at": place.updated_at,
    }


def source_rows(place: Place) -> list[dict[str, Any]]:
    return [
        {
            "place_id": place.id,
            "source": source,
            "source_id": source_id,
            "source_url": place.source_url,
            "license": place.license,
            "fetched_at": place.updated_at,
        }
        for source, source_id in place.source_ids.items()
    ]


def trail_row(trail: Trail) -> dict[str, Any]:
    return {
        "id": trail.id,
        "name": trail.name,
        "geometry": trail.geometry,
        "distance_km": trail.distance_km,
        "elevation_gain_m": trail.elevation_gain_m,
        "difficulty": trail.difficulty,
        "best_season": trail.best_season,
        "permit_required": trail.permit_required,
        "days": trail.days,
        "description": trail.description,
        "license": trail.license,
        "attribution": trail.attribution,
        "source_url": trail.source_url,
        "source_ids": trail.source_ids,
        "created_at": trail.created_at,
        "updated_at": trail.updated_at,
    }


def load(
    engine: Engine,
    place_list: Iterable[Place],
    trail_list: Iterable[Trail],
    media: dict[str, dict[str, Any]] | None = None,
) -> tuple[int, int]:
    """Replace the canonical tables with the current derived dataset."""
    media = media or {}
    place_rows = [place_row(place, media.get(place.wikidata_id or "")) for place in place_list]
    source_rows_all = [row for place in place_list for row in source_rows(place)]
    trail_rows = [trail_row(trail) for trail in trail_list]
    with engine.begin() as conn:
        conn.execute(place_sources.delete())
        conn.execute(places.delete())
        conn.execute(trails.delete())
        if place_rows:
            conn.execute(places.insert(), place_rows)
        if source_rows_all:
            conn.execute(place_sources.insert(), source_rows_all)
        if trail_rows:
            conn.execute(trails.insert(), trail_rows)
    return len(place_rows), len(trail_rows)
