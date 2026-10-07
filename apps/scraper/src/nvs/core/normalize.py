from __future__ import annotations

import re
import unicodedata

from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

_DEVANAGARI_RE = re.compile(r"[ऀ-ॿ]")
_WS_RE = re.compile(r"\s+")
_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_SUFFIX_RE = re.compile(
    r"\b(hotel|restro|restaurant|cafe|café|pyau|guesthouse|guest_house|lodge|resort|"
    r"dhaba|bhojanalaya|kitchen|bhatti)\b",
    re.IGNORECASE,
)

NEPAL_LAT = (26.3, 30.5)
NEPAL_LNG = (80.0, 88.3)


def _fold_diacritics(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return unicodedata.normalize("NFC", stripped)


def transliterate_devanagari(name: str) -> str:
    if not _DEVANAGARI_RE.search(name):
        return name
    latin = transliterate(name, sanscript.DEVANAGARI, sanscript.IAST)
    return _fold_diacritics(latin)


def normalize_name(name: str, ne: str | None = None) -> str:
    if not name:
        return ""
    primary = name if not _DEVANAGARI_RE.search(name) else transliterate_devanagari(name)
    if _DEVANAGARI_RE.search(primary):
        primary = transliterate_devanagari(primary)
    text = primary if ne is None else f"{primary} {ne}"
    text = transliterate_devanagari(text)
    text = text.lower()
    text = _PUNCT_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text).strip()
    text = _SUFFIX_RE.sub("", text)
    text = _WS_RE.sub(" ", text).strip()
    return _fold_diacritics(text).lower()


def clamp_coords(lat: float | None, lng: float | None) -> tuple[float, float] | None:
    if lat is None or lng is None:
        return None
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return None
    if lat != lat or lng != lng:
        return None
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
        return None
    if not (NEPAL_LAT[0] <= lat <= NEPAL_LAT[1]) and not (
        NEPAL_LNG[0] <= lng <= NEPAL_LNG[1]
    ):
        return None
    return (float(lat), float(lng))


def is_valid_name(name: str | None) -> bool:
    return bool(name) and len(name.strip()) >= 2
