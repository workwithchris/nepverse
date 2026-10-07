from __future__ import annotations

from collections.abc import Iterator

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


class OsmSource(SourceBase):
    name = "osm"
    license = "ODbL-1.0"
    attribution = "© OpenStreetMap contributors"

    def fetch(self) -> Iterator[SourceRecord]:
        raise NotImplementedError(
            "M1: OSM extraction not implemented yet (Overpass query + Geofabrik PBF, M2)"
        )

    def plan(self) -> list[str]:
        overpass = self.endpoints.get("overpass", "https://overpass-api.de/api/interpreter")
        geofabrik = self.endpoints.get(
            "geofabrik", "https://download.geofabrik.de/asia/nepal/nepal-latest.osm.pbf"
        )
        return [
            f"POST {overpass} data={OVERPASS_QUERY.splitlines()[0]} ... (full query, {len(OVERPASS_QUERY)} chars)",
            f"GET  {geofabrik}  (bulk seed, parsed with pyrosm in M2)",
            "HDX HOTOSM POI: https://data.humdata.org/dataset/hotosm_nepal_poi",
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
