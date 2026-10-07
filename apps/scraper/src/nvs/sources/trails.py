from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import osmium

from nvs.core.models import SourceRecord
from nvs.pipeline.trails import longest_chain
from nvs.sources.base import SourceBase
from nvs.sources.osm import DEFAULT_GEOFABRIK, PBF_NAME

ROUTE_VALUES = {"hiking", "foot"}


class _RelationCollector(osmium.SimpleHandler):
    def __init__(self) -> None:
        super().__init__()
        self.relations: list[tuple[int, dict[str, str], list[tuple[str, int, str]]]] = []

    def relation(self, relation: osmium.osm.Relation) -> None:
        tags = {tag.k: tag.v for tag in relation.tags}
        if tags.get("route") not in ROUTE_VALUES:
            return
        members = [
            (str(member.type), member.ref, member.role)
            for member in relation.members
        ]
        self.relations.append((relation.id, tags, members))


class _WayCollector(osmium.SimpleHandler):
    def __init__(self, needed: set[int]) -> None:
        super().__init__()
        self.needed = needed
        self.ways: dict[int, list[list[float]]] = {}

    def way(self, way: osmium.osm.Way) -> None:
        if way.id not in self.needed:
            return
        self.ways[way.id] = [
            [node.location.lat, node.location.lon] for node in way.nodes
        ]


class TrailsSource(SourceBase):
    name = "trails"
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
        pbf = str(self._ensure_pbf())

        collector = _RelationCollector()
        collector.apply_file(pbf)

        needed: set[int] = {
            ref
            for _, _, members in collector.relations
            for member_type, ref, _ in members
            if member_type == "w"
        }
        ways = _WayCollector(needed)
        ways.apply_file(pbf, locations=True)

        for rel_id, tags, members in collector.relations:
            name = tags.get("name:en") or tags.get("name")
            if not name:
                continue
            segments = [
                ways.ways[ref]
                for member_type, ref, _ in members
                if member_type == "w" and ref in ways.ways and len(ways.ways[ref]) >= 2
            ]
            geometry = longest_chain(segments)
            if len(geometry) < 2:
                continue
            yield SourceRecord(
                source=self.name,
                source_id=f"relation/{rel_id}",
                source_url=f"https://www.openstreetmap.org/relation/{rel_id}",
                license=self.license,
                attribution=self.attribution,
                payload={
                    "name_en": name,
                    "name_ne": tags.get("name:ne"),
                    "lat": geometry[0][0],
                    "lng": geometry[0][1],
                    "description": tags.get("description"),
                    "geometry": geometry,
                    "tags": tags,
                },
            )

    def plan(self) -> list[str]:
        return [
            f"read {self._pbf_path()} with pyosmium (offline, no Overpass)",
            f"relations with route in {sorted(ROUTE_VALUES)}; chain member ways via longest_chain",
        ]
