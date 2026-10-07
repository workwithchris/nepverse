from __future__ import annotations

import re
from collections.abc import Iterator
from typing import Any

from nvs.core.models import SourceRecord
from nvs.sources.base import SourceBase

# wd:Q837 = Nepal (Q819 is Laos).
SPARQL = """
SELECT ?item ?itemLabel ?itemLabelNe ?coord ?image ?instanceOfLabel ?heritageLabel WHERE {
  ?item wdt:P17 wd:Q837 ;
        wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P31 ?instanceOf }
  OPTIONAL { ?item wdt:P1435 ?heritage }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item rdfs:label ?itemLabelNe FILTER(LANG(?itemLabelNe) = "ne") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ne". }
}
LIMIT 20000
""".strip()

DEFAULT_SPARQL = "https://query.wikidata.org/sparql"
DEFAULT_API = "https://www.wikidata.org/w/api.php"

_POINT_RE = re.compile(r"Point\(([-0-9.]+) ([-0-9.]+)\)")
_QID_RE = re.compile(r"/(Q\d+)$")


def _coord(value: str) -> tuple[float, float] | None:
    match = _POINT_RE.search(value or "")
    if not match:
        return None
    lng, lat = float(match.group(1)), float(match.group(2))
    return lat, lng


def _qid(uri: str) -> str | None:
    match = _QID_RE.search(uri or "")
    return match.group(1) if match else None


def bindings_to_records(bindings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for row in bindings:
        qid = _qid(row.get("item", {}).get("value", ""))
        if not qid:
            continue
        entry = grouped.setdefault(
            qid,
            {
                "name_en": None,
                "name_ne": None,
                "coord": None,
                "image": None,
                "instance_of": set(),
                "heritage": set(),
            },
        )
        if row.get("itemLabel"):
            entry["name_en"] = entry["name_en"] or row["itemLabel"]["value"]
        if row.get("itemLabelNe"):
            entry["name_ne"] = entry["name_ne"] or row["itemLabelNe"]["value"]
        if row.get("coord") and entry["coord"] is None:
            entry["coord"] = _coord(row["coord"]["value"])
        if row.get("image"):
            entry["image"] = entry["image"] or row["image"]["value"]
        if row.get("instanceOfLabel"):
            entry["instance_of"].add(row["instanceOfLabel"]["value"])
        if row.get("heritageLabel"):
            entry["heritage"].add(row["heritageLabel"]["value"])
    return [{"qid": qid, **entry} for qid, entry in grouped.items()]


class WikidataSource(SourceBase):
    name = "wikidata"
    license = "CC0 1.0"
    attribution = "Wikidata contributors"

    def _sparql(self) -> str:
        return self.endpoints.get("sparql", DEFAULT_SPARQL)

    def fetch(self) -> Iterator[SourceRecord]:
        response = self.client.get(
            self._sparql(),
            params={"query": SPARQL, "format": "json"},
        )
        bindings = response.json().get("results", {}).get("bindings", [])
        for entry in bindings_to_records(bindings):
            coord = entry["coord"]
            if coord is None:
                continue
            name = entry["name_en"]
            if not name:
                continue
            tags = {
                "instance_of": sorted(entry["instance_of"]),
                "heritage_designation": sorted(entry["heritage"]),
            }
            yield SourceRecord(
                source=self.name,
                source_id=entry["qid"],
                source_url=f"https://www.wikidata.org/wiki/{entry['qid']}",
                license=self.license,
                attribution=self.attribution,
                payload={
                    "name_en": name,
                    "name_ne": entry["name_ne"],
                    "lat": coord[0],
                    "lng": coord[1],
                    "wikidata_id": entry["qid"],
                    "image": entry["image"],
                    "tags": tags,
                },
            )

    def plan(self) -> list[str]:
        api = self.endpoints.get("api", DEFAULT_API)
        return [
            f"GET  {self._sparql()} (P17=Q837 Nepal, P625 coords, P31/P1435/P18; LIMIT 20000)",
            f"GET  {api} action=wbgetentities&ids=...&props=labels|descriptions|claims",
        ]
