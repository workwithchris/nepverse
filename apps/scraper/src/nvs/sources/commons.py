from __future__ import annotations

import re
from collections.abc import Iterator
from typing import Any
from urllib.parse import unquote

from nvs.core.models import SourceRecord
from nvs.sources.base import SourceBase

DEFAULT_API = "https://commons.wikimedia.org/w/api.php"
BATCH = 50

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def _strip_html(value: str) -> str:
    return _WS_RE.sub(" ", _TAG_RE.sub(" ", value or "")).strip()


def file_title(image_url: str) -> str | None:
    """Wikidata P18 -> 'File:Name.jpg'."""
    if not image_url:
        return None
    name = unquote(image_url.rstrip("/").rsplit("/", 1)[-1])
    if not name:
        return None
    return name if name.lower().startswith("file:") else f"File:{name}"


def parse_imageinfo(page: dict[str, Any]) -> dict[str, Any] | None:
    info = (page.get("imageinfo") or [{}])[0]
    ext = info.get("extmetadata") or {}

    def meta(key: str) -> str | None:
        raw = ext.get(key, {}).get("value")
        return _strip_html(raw) if raw else None

    return {
        "file": page.get("title"),
        "image_url": info.get("thumburl") or info.get("url"),
        "page_url": info.get("descriptionurl"),
        "license": meta("LicenseShortName"),
        "license_url": meta("LicenseUrl"),
        "author": meta("Artist"),
        "attribution": meta("Attribution") or meta("Credit"),
    }


class CommonsSource(SourceBase):
    name = "commons"
    license = "CC BY-SA 4.0 / individual file licenses"
    attribution = "Wikimedia Commons contributors"

    def _api(self) -> str:
        return self.endpoints.get("api", DEFAULT_API)

    def _image_files(self) -> dict[str, str]:
        """Map Commons file title -> Wikidata QID for every Wikidata record with a P18 image."""
        from nvs.pipeline.extract import read_all_records

        mapping: dict[str, str] = {}
        for record in read_all_records(self.settings):
            if record.source != "wikidata":
                continue
            image = record.payload.get("image")
            qid = record.payload.get("wikidata_id")
            if not image or not qid:
                continue
            title = file_title(str(image))
            if title:
                mapping[title] = str(qid)
        return mapping

    def fetch(self) -> Iterator[SourceRecord]:
        files = self._image_files()
        titles = sorted(files)
        for start in range(0, len(titles), BATCH):
            batch = titles[start : start + BATCH]
            data = self.client.get(
                self._api(),
                params={
                    "action": "query",
                    "prop": "imageinfo",
                    "iiprop": "url|extmetadata",
                    "iiurlwidth": "800",
                    "titles": "|".join(batch),
                    "format": "json",
                    "formatversion": "2",
                },
            ).json()
            for page in data.get("query", {}).get("pages", []):
                parsed = parse_imageinfo(page)
                if not parsed or not parsed.get("image_url"):
                    continue
                qid = files.get(parsed["file"] or "")
                if not qid:
                    continue
                yield SourceRecord(
                    source=self.name,
                    source_id=parsed["file"] or qid,
                    source_url=parsed["page_url"] or "",
                    license=parsed["license"] or self.license,
                    attribution=parsed["attribution"] or self.attribution,
                    payload={"wikidata_id": qid, **parsed},
                )

    def plan(self) -> list[str]:
        return [
            f"GET  {self._api()} prop=imageinfo iiprop=url|extmetadata (batches of {BATCH})",
            "source: P18 image files from raw wikidata records",
        ]
