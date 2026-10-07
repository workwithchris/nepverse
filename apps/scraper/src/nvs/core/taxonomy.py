from __future__ import annotations

from nvs.core.models import PlaceType

_TRUST_ORDER = ["wikidata", "osm", "wikivoyage", "google", "other"]


def trust_rank(source: str) -> int:
    try:
        return _TRUST_ORDER.index(source)
    except ValueError:
        return len(_TRUST_ORDER)


_OSM_EXACT: dict[tuple[str, str], PlaceType] = {
    ("tourism", "hotel"): PlaceType.LODGING,
    ("tourism", "hostel"): PlaceType.LODGING,
    ("tourism", "motel"): PlaceType.LODGING,
    ("tourism", "resort"): PlaceType.LODGING,
    ("tourism", "guest_house"): PlaceType.GUESTHOUSE,
    ("tourism", "chalet"): PlaceType.GUESTHOUSE,
    ("tourism", "apartments"): PlaceType.LODGING,
    ("tourism", "camp_site"): PlaceType.LODGING,
    ("tourism", "museum"): PlaceType.MUSEUM,
    ("tourism", "gallery"): PlaceType.MUSEUM,
    ("tourism", "information"): PlaceType.INFO_CENTER,
    ("tourism", "artwork"): PlaceType.ATTRACTION,
    ("tourism", "viewpoint"): PlaceType.VIEWPOINT,
    ("tourism", "attraction"): PlaceType.ATTRACTION,
    ("tourism", "picnic_site"): PlaceType.ATTRACTION,
    ("tourism", "theme_park"): PlaceType.ATTRACTION,
    ("tourism", "zoo"): PlaceType.PARK,
    ("tourism", "wildlife_park"): PlaceType.PROTECTED_AREA,
    ("tourism", "alpine_hut"): PlaceType.GUESTHOUSE,
    ("amenity", "restaurant"): PlaceType.RESTAURANT,
    ("amenity", "fast_food"): PlaceType.STREET_FOOD,
    ("amenity", "food_court"): PlaceType.STREET_FOOD,
    ("amenity", "cafe"): PlaceType.CAFE,
    ("amenity", "bar"): PlaceType.BAR,
    ("amenity", "pub"): PlaceType.BAR,
    ("amenity", "bar_pub"): PlaceType.BAR,
    ("amenity", "biergarten"): PlaceType.BAR,
    ("amenity", "ice_cream"): PlaceType.STREET_FOOD,
    ("amenity", "bank"): PlaceType.BANK_ATM,
    ("amenity", "atm"): PlaceType.BANK_ATM,
    ("amenity", "clinic"): PlaceType.HEALTHCARE,
    ("amenity", "hospital"): PlaceType.HEALTHCARE,
    ("amenity", "pharmacy"): PlaceType.HEALTHCARE,
    ("amenity", "doctors"): PlaceType.HEALTHCARE,
    ("amenity", "toilets"): PlaceType.TOILET,
    ("amenity", "townhall"): PlaceType.INFO_CENTER,
    ("amenity", "place_of_worship"): PlaceType.TEMPLE,
    ("amenity", "parking"): PlaceType.TRANSPORT,
    ("amenity", "bus_station"): PlaceType.TRANSPORT,
    ("amenity", "taxi"): PlaceType.TRANSPORT,
    ("amenity", "bicycle_rental"): PlaceType.ACTIVITY,
    ("amenity", "car_rental"): PlaceType.TRANSPORT,
    ("amenity", "fuel"): PlaceType.SHOP,
    ("amenity", "marketplace"): PlaceType.SHOP,
    ("amenity", "library"): PlaceType.ATTRACTION,
    ("leisure", "park"): PlaceType.PARK,
    ("leisure", "garden"): PlaceType.PARK,
    ("leisure", "playground"): PlaceType.PARK,
    ("leisure", "nature_reserve"): PlaceType.PROTECTED_AREA,
    ("leisure", "sports_centre"): PlaceType.ACTIVITY,
    ("leisure", "pitch"): PlaceType.ACTIVITY,
    ("shop", "*"): PlaceType.SHOP,
    ("railway", "station"): PlaceType.TRANSPORT,
    ("railway", "halt"): PlaceType.TRANSPORT,
    ("aeroway", "aerodrome"): PlaceType.TRANSPORT,
    ("highway", "bus_stop"): PlaceType.TRANSPORT,
    ("boundary", "protected_area"): PlaceType.PROTECTED_AREA,
    ("natural", "peak"): PlaceType.PEAK,
    ("natural", "waterfall"): PlaceType.WATERFALL,
    ("natural", "water"): PlaceType.ATTRACTION,
    ("natural", "park"): PlaceType.PARK,
    ("route", "hiking"): PlaceType.TREKKING_ROUTE,
}

_OSM_WILDCARD: tuple[tuple[str, str], PlaceType] = (
    ("historic", "*"),
    PlaceType.HERITAGE,
)

_RELIGIOUS = {
    "hindu",
    "buddhist",
    "moslem",
    "muslim",
    "sikh",
    "shinto",
    "christian",
    "jewish",
    "taoist",
    "confucian",
}


def _map_osm(tags: dict[str, str]) -> PlaceType:
    for key in (
        "tourism",
        "amenity",
        "leisure",
        "shop",
        "railway",
        "aeroway",
        "highway",
        "natural",
        "boundary",
        "route",
    ):
        if key in tags:
            mapped = _OSM_EXACT.get((key, tags[key]))
            if mapped is not None:
                if key == "amenity" and tags[key] == "place_of_worship":
                    if tags.get("religion") in _RELIGIOUS:
                        return PlaceType.TEMPLE
                return mapped
            if key == "shop":
                return PlaceType.SHOP
    if tags.get("historic") or tags.get("heritage"):
        return PlaceType.HERITAGE
    return PlaceType.OTHER


_WIKIVOYAGE: dict[str, PlaceType] = {
    "sleep": PlaceType.LODGING,
    "sleep around": PlaceType.LODGING,
    "hotel": PlaceType.LODGING,
    "guesthouse": PlaceType.GUESTHOUSE,
    "hostel": PlaceType.LODGING,
    "homestay": PlaceType.HOMESTAY,
    "see": PlaceType.ATTRACTION,
    "see and do": PlaceType.ATTRACTION,
    "do": PlaceType.ACTIVITY,
    "buy": PlaceType.SHOP,
    "eat": PlaceType.RESTAURANT,
    "drink": PlaceType.BAR,
    "listing": PlaceType.ATTRACTION,
    "connect": PlaceType.INFO_CENTER,
}


def _map_wikivoyage(tags: dict[str, str]) -> PlaceType:
    section = (tags.get("section") or tags.get("category") or "").strip().lower()
    if section in _WIKIVOYAGE:
        return _WIKIVOYAGE[section]
    for key, value in _WIKIVOYAGE.items():
        if section.startswith(key):
            return value
    return PlaceType.OTHER


def _map_wikidata(tags: dict[str, str]) -> PlaceType:
    types = [t.lower() for t in tags.get("instance_of", [])] if "instance_of" in tags else []
    joined = " ".join(types)
    if "museum" in joined:
        return PlaceType.MUSEUM
    if any(w in joined for w in ("temple", "mandir", "stupa", "shrine", "monastery", "pagoda")):
        return PlaceType.TEMPLE
    if any(w in joined for w in ("hotel", "lodge", "guest house", "motel", "resort")):
        return PlaceType.LODGING
    if "restaurant" in joined or "cafe" in joined:
        return PlaceType.RESTAURANT
    if any(w in joined for w in ("park", "reserve", "conservation")):
        return PlaceType.PROTECTED_AREA
    if any(w in joined for w in ("mountain", "peak", "summit")):
        return PlaceType.PEAK
    if any(w in joined for w in ("waterfall", "falls")):
        return PlaceType.WATERFALL
    if any(w in joined for w in ("heritage", "monument", "palace", "ruins", "archaeological")):
        return PlaceType.HERITAGE
    if "viewpoint" in joined or "lookout" in joined:
        return PlaceType.VIEWPOINT
    if "trail" in joined or "trekking route" in joined:
        return PlaceType.TREKKING_ROUTE
    return PlaceType.OTHER


_MAPPERS = {
    "osm": _map_osm,
    "hotosm": _map_osm,
    "wikivoyage": _map_wikivoyage,
    "wikidata": _map_wikidata,
}


def map_category(source: str, raw_tags: dict) -> PlaceType:
    normalized: dict[str, str] = {}
    for key, value in raw_tags.items():
        if isinstance(value, list):
            normalized[str(key)] = value
        else:
            normalized[str(key)] = str(value)
    mapper = _MAPPERS.get(source)
    if mapper is None:
        return PlaceType.OTHER
    return mapper(normalized)
