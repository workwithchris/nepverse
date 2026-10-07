from __future__ import annotations

from nvs.sources.commons import _strip_html, file_title, parse_imageinfo


def test_file_title_from_wikidata_special_filepath() -> None:
    url = "http://commons.wikimedia.org/wiki/Special:FilePath/Mount_Everest.jpg"
    assert file_title(url) == "File:Mount_Everest.jpg"
    assert file_title("") is None


def test_strip_html_removes_tags() -> None:
    assert _strip_html('<a href="x">Jane Doe</a>') == "Jane Doe"


def test_parse_imageinfo_extracts_license_and_author() -> None:
    page = {
        "title": "File:Everest.jpg",
        "imageinfo": [
            {
                "thumburl": "https://upload.wikimedia.org/thumb.jpg",
                "url": "https://upload.wikimedia.org/full.jpg",
                "descriptionurl": "https://commons.wikimedia.org/wiki/File:Everest.jpg",
                "extmetadata": {
                    "LicenseShortName": {"value": "CC BY-SA 4.0"},
                    "LicenseUrl": {"value": "https://creativecommons.org/licenses/by-sa/4.0/"},
                    "Artist": {"value": "<a href='#'>Jane Doe</a>"},
                    "Attribution": {"value": "Jane Doe / Wikimedia"},
                },
            }
        ],
    }
    parsed = parse_imageinfo(page)
    assert parsed is not None
    assert parsed["image_url"] == "https://upload.wikimedia.org/thumb.jpg"
    assert parsed["license"] == "CC BY-SA 4.0"
    assert parsed["author"] == "Jane Doe"
    assert parsed["attribution"] == "Jane Doe / Wikimedia"
    assert parsed["page_url"].endswith("File:Everest.jpg")


def test_parse_imageinfo_missing_metadata() -> None:
    assert parse_imageinfo({"title": "File:X"})["image_url"] is None
