from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class PlaceType(StrEnum):
    ATTRACTION = "attraction"
    HERITAGE = "heritage"
    TEMPLE = "temple"
    MUSEUM = "museum"
    PARK = "park"
    PROTECTED_AREA = "protected_area"
    VIEWPOINT = "viewpoint"
    WATERFALL = "waterfall"
    PEAK = "peak"
    RESTAURANT = "restaurant"
    STREET_FOOD = "street_food"
    CAFE = "cafe"
    BAR = "bar"
    LODGING = "lodging"
    GUESTHOUSE = "guesthouse"
    HOMESTAY = "homestay"
    TRAIL = "trail"
    TREKKING_ROUTE = "trekking_route"
    ACTIVITY = "activity"
    TRANSPORT = "transport"
    SHOP = "shop"
    HEALTHCARE = "healthcare"
    BANK_ATM = "bank_atm"
    TOILET = "toilet"
    INFO_CENTER = "info_center"
    OTHER = "other"


class PlaceStatus(StrEnum):
    OPEN = "open"
    CLOSED = "closed"
    UNKNOWN = "unknown"


class SourceRecord(BaseModel):
    source: str
    source_id: str
    source_url: str = ""
    license: str = ""
    attribution: str = ""
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    payload: dict[str, Any] = Field(default_factory=dict)


class RawBatch(BaseModel):
    source: str
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    records: list[SourceRecord] = Field(default_factory=list)


class Place(BaseModel):
    id: str
    name_en: str
    name_ne: str | None = None
    place_type: PlaceType = PlaceType.OTHER
    lat: float
    lng: float
    address: str | None = None
    opening_hours: str | None = None
    price_level: int | None = None
    rating: float | None = None
    review_count: int | None = None
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    wikidata_id: str | None = None
    source_ids: dict[str, str] = Field(default_factory=dict)
    license: str = ""
    attribution: str = ""
    source_url: str = ""
    status: PlaceStatus = PlaceStatus.UNKNOWN
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Trail(BaseModel):
    id: str
    name: str
    geometry: list[list[float]] = Field(default_factory=list)
    distance_km: float | None = None
    elevation_gain_m: float | None = None
    difficulty: str | None = None
    best_season: str | None = None
    permit_required: bool | None = None
    days: int | None = None
    description: str | None = None
    license: str = ""
    attribution: str = ""
    source_url: str = ""
    source_ids: dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

