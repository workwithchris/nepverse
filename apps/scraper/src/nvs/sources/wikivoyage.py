from __future__ import annotations

import re
from collections.abc import Iterator
from typing import Any

from nvs.core.models import SourceRecord
from nvs.sources.base import SourceBase

LISTING_TEMPLATES = {"listing", "see", "do", "eat", "drink", "sleep", "buy", "go"}
LISTING_SECTIONS = ["See", "Do", "Buy", "Eat", "Drink", "Sleep", "Listing"]

SEED_PAGES = [
    "Nepal",
    "Kathmandu",
    "Kathmandu Valley",
    "Pokhara",
    "Bhaktapur",
    "Patan",
    "Chitwan National Park",
    "Bardia National Park",
    "Sagarmatha National Park",
    "Lumbini",
    "Annapurna Circuit",
    "Everest Base Camp Trek",
    "Langtang Valley Trek",
    "Manaslu Circuit",
    "Upper Mustang",
    "Bandipur",
    "Nagarkot",
    "Namche Bazaar",
    "Ghandruk",
    "Rara Lake",
    "Ilam",
    "Janakpur",
    "Gorkha",
    "Nuwakot",
    "Tansen",
    "Dharan",
    "Biratnagar",
    "Nepalgunj",
]

CATEGORY_ROOTS = ["Category:Nepal"]
MAX_CATEGORIES = 80
MAX_PAGES = 400
BATCH = 50

_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
_REF_RE = re.compile(r"<ref[^>]*>.*?</ref>|<ref[^>]*/>", re.DOTALL | re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]+>")
_FILE_RE = re.compile(r"\[\[(?:File|Image):[^\]]*\]\]", re.IGNORECASE)
_LINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
_EXT_LINK_RE = re.compile(r"\[https?://\S+\s+([^\]]+)\]")
_QUOTES_RE = re.compile(r"'{2,5}")
_WS_RE = re.compile(r"[ \t]+")


def _clean_wiki(text: str) -> str:
    text = _COMMENT_RE.sub(" ", text)
    text = _REF_RE.sub(" ", text)
    text = _FILE_RE.sub(" ", text)
    text = _LINK_RE.sub(lambda m: m.group(2) or m.group(1), text)
    text = _EXT_LINK_RE.sub(r"\1", text)
    text = _TAG_RE.sub(" ", text)
    text = _QUOTES_RE.sub("", text)
    text = text.replace("'''", "").replace("''", "")
    return _WS_RE.sub(" ", text).strip()


def _iter_templates(text: str) -> Iterator[tuple[str, str]]:
    i = 0
    n = len(text)
    while i < n - 1:
        if text[i] == "{" and text[i + 1] == "{":
            depth = 2
            j = i + 2
            while j < n and depth > 0:
                if text[j] == "{" and text[j + 1 : j + 2] == "{":
                    depth += 2
                    j += 2
                    continue
                if text[j] == "}" and text[j + 1 : j + 2] == "}":
                    depth -= 2
                    j += 2
                    continue
                j += 1
            body = text[i + 2 : max(j - 2, i + 2)]
            name, _, params = body.partition("|")
            yield name.strip().lower(), params
            i = j
        else:
            i += 1


def _split_params(body: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    i = 0
    n = len(body)
    while i < n:
        pair = body[i : i + 2]
        if pair in ("{{", "[["):
            depth += 1
        elif pair in ("}}", "]]"):
            depth -= 1
        if body[i] == "|" and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(body[i])
        i += 1
    parts.append("".join(buf))
    return parts


def _parse_listing(name: str, body: str) -> dict[str, Any] | None:
    params: dict[str, str] = {}
    positional: list[str] = []
    for chunk in _split_params(body):
        key, sep, value = chunk.partition("=")
        if sep and " " not in key.strip() and len(key.strip()) < 25:
            params[key.strip().lower()] = value.strip()
        elif chunk.strip():
            positional.append(chunk.strip())

    listing_name = params.get("name") or (positional[0] if positional else "")
    listing_name = _clean_wiki(listing_name)
    if not listing_name:
        return None

    lat = params.get("lat") or params.get("latitude")
    lng = params.get("long") or params.get("lon") or params.get("longitude")
    section = params.get("type", name).strip().lower()
    content = params.get("content") or params.get("description") or ""
    return {
        "name": listing_name,
        "alt": _clean_wiki(params.get("alt", "")),
        "lat": lat,
        "lng": lng,
        "address": _clean_wiki(params.get("address", "")) or None,
        "phone": params.get("phone"),
        "url": params.get("url"),
        "hours": _clean_wiki(params.get("hours", "")) or None,
        "price": _clean_wiki(params.get("price", "")) or None,
        "wikidata": params.get("wikidata"),
        "description": _clean_wiki(content) or None,
        "section": section,
    }


def parse_listings(text: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for name, body in _iter_templates(text):
        if name not in LISTING_TEMPLATES:
            continue
        listing = _parse_listing(name, body)
        if listing is not None:
            out.append(listing)
    return out


class WikivoyageSource(SourceBase):
    name = "wikivoyage"
    license = "CC BY-SA 4.0"
    attribution = "Wikivoyage contributors"

    def _api(self) -> str:
        return self.endpoints.get("api", "https://en.wikivoyage.org/w/api.php")

    def _category_members(self, title: str) -> list[dict]:
        data = self.client.get(
            self._api(),
            params={
                "action": "query",
                "list": "categorymembers",
                "cmtitle": title,
                "cmlimit": "500",
                "format": "json",
            },
        ).json()
        return data.get("query", {}).get("categorymembers", [])

    def _discover_pages(self) -> list[str]:
        pages: set[str] = set(SEED_PAGES)
        seen: set[str] = set()
        queue = list(CATEGORY_ROOTS)
        while queue and len(seen) < MAX_CATEGORIES:
            category = queue.pop(0)
            if category in seen:
                continue
            seen.add(category)
            for member in self._category_members(category):
                if member.get("ns") == 14:
                    queue.append(member["title"])
                elif member.get("ns") == 0:
                    pages.add(member["title"])
        return sorted(pages)[:MAX_PAGES]

    def _fetch_wikitext(self, titles: list[str]) -> Iterator[tuple[str, str]]:
        for start in range(0, len(titles), BATCH):
            batch = titles[start : start + BATCH]
            data = self.client.get(
                self._api(),
                params={
                    "action": "query",
                    "prop": "revisions",
                    "rvprop": "content",
                    "rvslots": "main",
                    "titles": "|".join(batch),
                    "format": "json",
                    "formatversion": "2",
                },
            ).json()
            for page in data.get("query", {}).get("pages", []):
                title = page.get("title", "")
                revisions = page.get("revisions") or []
                if not revisions:
                    continue
                content = revisions[0].get("slots", {}).get("main", {}).get("content", "")
                if content:
                    yield title, content

    def fetch(self) -> Iterator[SourceRecord]:
        titles = self._discover_pages()
        for title, text in self._fetch_wikitext(titles):
            for index, listing in enumerate(parse_listings(text)):
                if not listing["lat"] or not listing["lng"]:
                    continue
                source_id = f"{title}#{index}"
                yield SourceRecord(
                    source=self.name,
                    source_id=source_id,
                    source_url=f"{self._api().replace('/w/api.php', '/wiki/')}{title.replace(' ', '_')}",
                    license=self.license,
                    attribution=self.attribution,
                    payload={
                        "name_en": listing["name"],
                        "name_ne": None,
                        "lat": listing["lat"],
                        "lng": listing["lng"],
                        "address": listing["address"],
                        "opening_hours": listing["hours"],
                        "description": listing["description"],
                        "wikidata_id": listing["wikidata"],
                        "tags": {
                            "section": listing["section"],
                            "price": listing["price"],
                            "url": listing["url"],
                            "phone": listing["phone"],
                            "page": title,
                        },
                    },
                )

    def plan(self) -> list[str]:
        api = self._api()
        return [
            f"GET  {api} list=categorymembers cmtitle=Category:Nepal (recursive, depth<=80 cats)",
            f"GET  {api} prop=revisions (wikitext batches of {BATCH})",
            f"templates parsed: {sorted(LISTING_TEMPLATES)}",
            f"seed pages: {len(SEED_PAGES)}",
        ]
