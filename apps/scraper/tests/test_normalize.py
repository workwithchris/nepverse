from __future__ import annotations

from nvs.core.models import Place, PlaceType
from nvs.core.normalize import clamp_coords, normalize_name, transliterate_devanagari


def test_normalize_strips_suffixes() -> None:
    assert normalize_name("Hotel Yak & Yeti") == "yak yeti"
    assert normalize_name("Shiva Mandir") == "shiva mandir"
    assert normalize_name("Shiva Mandir Hotel") == "shiva mandir"
    assert normalize_name("Annapurna Guesthouse") == "annapurna"
    assert normalize_name("Everest Restro Cafe") == "everest"
    assert normalize_name("Pokhara Lakeside Lodge") == "pokhara lakeside"


def test_normalize_lowercases_and_collapses_whitespace() -> None:
    assert normalize_name("   PASHUPATINATH   Temple ") == "pashupatinath temple"
    assert normalize_name("Boudhanath Stupa!") == "boudhanath stupa"


def test_normalize_strips_punctuation() -> None:
    assert normalize_name("Room 42 - Floor 2") == "room 42 floor 2"
    assert normalize_name("A-B") == "a b"
    assert normalize_name("Mocha Café") == "mocha"


def test_devanagari_transliterates_to_latin() -> None:
    result = normalize_name("काठमाडौं")
    assert result
    assert result.isascii()
    assert result.startswith("kath")


def test_devanagari_transliteration_preserves_readable_root() -> None:
    latin = transliterate_devanagari("पोखरा")
    assert latin.isascii()
    assert "pokhar" in latin.lower()


def test_normalize_ne_name_appends_transliterated() -> None:
    result = normalize_name("Chitwan National Park", ne="चितवन राष्ट्रिय निकुञ्ज")
    assert "chitwan national park" in result
    assert result.isascii()


def test_clamp_coords_valid_nepal() -> None:
    assert clamp_coords(27.7172, 85.3240) == (27.7172, 85.3240)


def test_clamp_coords_rejects_out_of_range() -> None:
    assert clamp_coords(95.0, 85.0) is None
    assert clamp_coords(27.7, 999.0) is None
    assert clamp_coords(None, 85.0) is None
    assert clamp_coords(float("nan"), 85.0) is None


def test_normalize_empty_name() -> None:
    assert normalize_name("") == ""


def test_normalize_input_not_mutated_for_place() -> None:
    place = Place(id="nv_1", name_en="Hotel Mandap", lat=27.7, lng=85.3)
    assert place.place_type == PlaceType.OTHER
    assert normalize_name(place.name_en) == "mandap"
