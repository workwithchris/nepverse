from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from nvs.core.models import SourceRecord
from nvs.sources.base import SourceBase

OVERPASS_QUERY = """[out:json][timeout:180];
area["ISO3166-2"="NP"]->.np;
(
  node["tourism"](area.np);
  way["tourism"](area.np);
  node["amenity"~"^(restaurant|cafe|bar|pub|fast_food|bank|atm|clinic|hospital|pharmacy|toilets|bus_station)$"](area.np);
  node["leisure"~"^(park|garden|nature_reserve)$"](area.np);
  node["shop"](area.np);
  node["historic"](area.np);
  node["natural"~"^(peak|waterfall)$"](area.np);
  relation["route"="hiking"](area.np);
);
out body center tags;"""

# First/second level PBF filters: `True` means "any value on this key".
PBF_FILTER: dict[str, Any] = {
    "tourism": True,
    "amenity": [
        "restaurant",
        "cafe",
        "bar",
        "pub",
        "fast_food",
        "food_court",
        "ice_cream",
        "bank",
        "atm",
        "clinic",
        "hospital",
        "pharmacy",
        "doctors",
        "toilets",
        "bus_station",
        "place_of_worship",
        "library",
        "marketplace",
        "fuel",
        "taxi",
        "bicycle_rental",
    ],
    "leisure": ["park", "garden", "nature_reserve", "playground", "sports_centre"],
    "historic": True,
    "shop": True,
    "natural": ["peak", "waterfall"],
    "route": ["hiking"],
    "boundary": ["protected_area"],
}

PBF_NAME = "nepal-latest.osm.pbf"
DEFAULT_GEOFABRIK = "https://download.geofabrik.de/asia/nepal-latest.osm.pbf"

_ADDR_PARTS = (
    "addr:street",
    "addr:housenumber",
    "addr:suburb",
    "addr:city",
    "addr:district",
)
_IGNORED_COLUMNS = {"id", "lat", "lon", "geometry", "timestamp", "version", "tags", "osm_type"}


def _as_tags(value: Any) -> dict[str, str]:
    if isinstance(value, dict):
        return {str(k): str(v) for k, v in value.items()}
    if isinstance(value, str):
        try:
            loaded = json.loads(value)
        except json.JSONDecodeError:
            return {}
        if isinstance(loaded, dict):
            return {str(k): str(v) for k, v in loaded.items()}
    return {}


def _row_tags(row: Any) -> dict[str, str]:
    """Fallback: rebuild a tag dict from expanded string columns."""
    tags: dict[str, str] = {}
    for key in row.index:
        if key in _IGNORED_COLUMNS:
            continue
        value = row.get(key)
        if isinstance(value, str) and value:
            tags[str(key)] = value
    return tags


def poi_payload(
    tags: dict[str, str],
    *,
    element_id: str,
    osm_type: str,
    lat: float,
    lng: float,
) -> dict[str, Any]:
    address = " ".join(tags[k] for k in _ADDR_PARTS if tags.get(k)).strip() or None
    return {
        "name_en": tags.get("name:en") or tags.get("name"),
        "name_ne": tags.get("name:ne"),
        "lat": lat,
        "lng": lng,
        "address": address,
        "opening_hours": tags.get("opening_hours"),
        "wikidata_id": tags.get("wikidata"),
        "website": tags.get("website") or tags.get("contact:website"),
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "osm_type": osm_type,
        "tags": tags,
    }


class OsmSource(SourceBase):
    name = "osm"
    license = "ODbL-1.0"
    attribution = "© OpenStreetMap contributors"

    def _pbf_path(self) -> Path:
        return self.settings.raw_dir / "osm" / PBF_NAME

    def _ensure_pbf(self) -> Path:
        dest = self._pbf_path()
        if dest.exists() and dest.stat().st_size > 0:
            return dest
        url = self.endpoints.get("geofabrik", DEFAULT_GEOFABRIK)
        return self.client.download(url, dest)

    def fetch(self) -> Iterator[SourceRecord]:
        from pyrosm import OSM

        pbf = self._ensure_pbf()
        gdf = OSM(str(pbf)).get_data_by_custom_criteria(
            custom_filter=PBF_FILTER,
            filter_type="keep",
            keep_nodes=True,
            keep_ways=True,
            keep_relations=True,
        )
        for _, row in gdf.iterrows():
            geom = row.get("geometry")
            if geom is None or geom.is_empty:
                continue
            is_node = geom.geom_type == "Point"
            point = geom if is_node else geom.centroid
            if point.is_empty:
                continue
            osm_id = row.get("id")
            if osm_id is None:
                continue
            osm_type = "node" if is_node else "way"
            element_id = f"{osm_type}/{int(osm_id)}"
            tags = _as_tags(row.get("tags")) or _row_tags(row)
            yield SourceRecord(
                source=self.name,
                source_id=element_id,
                source_url=f"https://www.openstreetmap.org/{element_id}",
                license=self.license,
                attribution=self.attribution,
                payload=poi_payload(
                    tags,
                    element_id=element_id,
                    osm_type=osm_type,
                    lat=float(point.y),
                    lng=float(point.x),
                ),
            )

    def plan(self) -> list[str]:
        geofabrik = self.endpoints.get("geofabrik", DEFAULT_GEOFABRIK)
        overpass = self.endpoints.get("overpass", "https://overpass-api.de/api/interpreter")
        return [
            f"GET  {geofabrik}  -> {self._pbf_path()} (cached; parsed with pyrosm)",
            f"keep keys: {', '.join(PBF_FILTER)}",
            f"POST {overpass} (Overpass fallback, {len(OVERPASS_QUERY)} chars)",
        ]


class HotosmSource(SourceBase):
    name = "hotosm"
    license = "ODbL-1.0"
    attribution = "© OpenStreetMap contributors / HOTOSM"

    def fetch(self) -> Iterator[SourceRecord]:
        raise NotImplementedError(
            "M1: HOTOSM HDX POI download not implemented yet (CSV/GeoJSON ingest, M2)"
        )

    def plan(self) -> list[str]:
        hdx = self.endpoints.get("hdx", "https://data.humdata.org/dataset/hotosm_nepal_poi")
        return [f"GET  {hdx} (download POI CSV/GeoJSON archive, ODbL)"]
