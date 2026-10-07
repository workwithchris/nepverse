from __future__ import annotations

from collections.abc import Iterator

from nvs.core.models import SourceRecord
from nvs.sources.base import SourceBase

LISTING_SECTIONS = ["See", "Do", "Buy", "Eat", "Drink", "Sleep", "Listing"]


class WikivoyageSource(SourceBase):
    name = "wikivoyage"
    license = "CC BY-SA 4.0"
    attribution = "Wikivoyage contributors"

    def fetch(self) -> Iterator[SourceRecord]:
        raise NotImplementedError(
            "M1: Wikivoyage wikitext listing parsing not implemented yet (M2)"
        )

    def plan(self) -> list[str]:
        api = self.endpoints.get("api", "https://en.wikivoyage.org/w/api.php")
        pages = ["Nepal", "Kathmandu", "Pokhara", "Chitwan National Park", "Lumbini"]
        out = []
        for page in pages:
            params = {
                "action": "parse",
                "page": page,
                "prop": "wikitext",
                "format": "json",
                "formatversion": "2",
                "redirects": "1",
            }
            out.append(f"GET  {api} {params}")
        out.append(f"sections parsed: {LISTING_SECTIONS}")
        return out
