import type { Place } from '@/core/api/types';
import type { PlaceFilters, PlaceSort } from '@/core/stores/filters-store';

export function sortPlaces(places: Place[], sort: PlaceSort): Place[] {
  const sorted = [...places];

  if (sort === 'name') {
    sorted.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    return sorted;
  }

  if (sort === 'price') {
    sorted.sort((a, b) => (a.priceLevel ?? 0) - (b.priceLevel ?? 0));
    return sorted;
  }

  sorted.sort(
    (a, b) =>
      (b.rating ?? 0) - (a.rating ?? 0) || a.nameEn.localeCompare(b.nameEn),
  );
  return sorted;
}

export function filterPlaces(places: Place[], filters: PlaceFilters): Place[] {
  const query = filters.query.trim().toLowerCase();

  const matched = places.filter((place) => {
    if (filters.category !== 'all' && place.placeType !== filters.category) {
      return false;
    }

    if (filters.minRating > 0 && (place.rating ?? 0) < filters.minRating) {
      return false;
    }

    if (query.length > 0) {
      const haystack = [
        place.nameEn,
        place.nameNe ?? '',
        place.address ?? '',
        ...place.tags,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });

  return sortPlaces(matched, filters.sort);
}
