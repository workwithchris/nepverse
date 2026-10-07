from __future__ import annotations

from collections.abc import Iterator

from nvs.core.models import SourceRecord
from nvs.sources.base import SourceBase

SPARQL = """
SELECT ?item ?itemLabel ?itemLabelNe ?coord ?instanceOf ?article WHERE {
  ?item wdt:P17 wd:Q819 ;
        wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P31 ?instanceOf }
  OPTIONAL { ?item rdfs:label ?itemLabelNe FILTER(LANG(?itemLabelNe) = "ne") }
  OPTIONAL { ?item rdfs:label ?itemLabel FILTER(LANG(?itemLabel) = "en") }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ne". }
}
LIMIT 5000
""".strip()


class WikidataSource(SourceBase):
    name = "wikidata"
    license = "CC0 1.0"
    attribution = "Wikidata contributors"

    def fetch(self) -> Iterator[SourceRecord]:
        raise NotImplementedError("M1: Wikidata SPARQL extraction not implemented yet (M2)")

    def plan(self) -> list[str]:
        sparql = self.endpoints.get("sparql", "https://query.wikidata.org/sparql")
        api = self.endpoints.get("api", "https://www.wikidata.org/w/api.php")
        return [
            f"GET  {sparql} query={SPARQL.splitlines()[1].strip()} ... ({len(SPARQL)} chars)",
            f"GET  {api} action=wbgetentities&ids=...&props=labels|descriptions|claims&languages=en|ne",
        ]
