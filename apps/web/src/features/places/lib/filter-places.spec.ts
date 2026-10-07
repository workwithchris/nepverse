import type { Place } from '@/core/api/types';
import { DEFAULT_PLACE_FILTERS } from '@/core/stores/filters-store';
import { filterPlaces, sortPlaces } from './filter-places';
import { placeFiltersSchema } from './filter-schema';

function makePlace(overrides: Partial<Place>): Place {
  return {
    id: 'sample',
    nameEn: 'Sample Place',
    placeType: 'attraction',
    lat: 27.7,
    lng: 85.3,
    tags: [],
    status: 'open',
    sources: [],
    ...overrides,
  };
}

const PLACES: Place[] = [
  makePlace({
    id: 'pashupatinath-temple',
    nameEn: 'Pashupatinath Temple',
    placeType: 'heritage',
    rating: 4.8,
    priceLevel: 2,
    tags: ['hindu', 'temple'],
  }),
  makePlace({
    id: 'himalaya-java',
    nameEn: 'Himalaya Java Cafe',
    placeType: 'cafe',
    rating: 4.5,
    priceLevel: 1,
    address: 'Thamel, Kathmandu',
    tags: ['coffee'],
  }),
  makePlace({
    id: 'sarangkot-viewpoint',
    nameEn: 'Sarangkot Viewpoint',
    placeType: 'viewpoint',
    rating: 3.9,
    priceLevel: 1,
    tags: ['sunrise', 'pokhara'],
  }),
  makePlace({
    id: 'thakali-kitchen',
    nameEn: 'Thakali Kitchen',
    placeType: 'restaurant',
    rating: null,
    priceLevel: 3,
    tags: ['thakali'],
  }),
];

describe('filterPlaces', () => {
  it('returns every place for the default filters', () => {
    expect(filterPlaces(PLACES, DEFAULT_PLACE_FILTERS)).toHaveLength(4);
  });

  it('filters by category and minimum rating together', () => {
    const result = filterPlaces(PLACES, {
      ...DEFAULT_PLACE_FILTERS,
      category: 'cafe',
      minRating: 4,
    });

    expect(result.map((place) => place.id)).toEqual(['himalaya-java']);
  });

  it('matches query text against names, addresses and tags', () => {
    const byTag = filterPlaces(PLACES, {
      ...DEFAULT_PLACE_FILTERS,
      query: 'sunrise',
    });
    const byAddress = filterPlaces(PLACES, {
      ...DEFAULT_PLACE_FILTERS,
      query: 'thamel',
    });
    const byName = filterPlaces(PLACES, {
      ...DEFAULT_PLACE_FILTERS,
      query: 'sarangkot',
    });

    expect(byTag.map((place) => place.id)).toEqual(['sarangkot-viewpoint']);
    expect(byAddress.map((place) => place.id)).toEqual(['himalaya-java']);
    expect(byName.map((place) => place.id)).toEqual(['sarangkot-viewpoint']);
  });

  it('excludes unrated places when a minimum rating is set', () => {
    const result = filterPlaces(PLACES, {
      ...DEFAULT_PLACE_FILTERS,
      minRating: 3,
    });

    expect(result.some((place) => place.id === 'thakali-kitchen')).toBe(false);
    expect(result).toHaveLength(3);
  });

  it('sorts by rating, name and price without mutating the input', () => {
    const originalOrder = PLACES.map((place) => place.id);

    const byRating = sortPlaces(PLACES, 'rating');
    const byName = sortPlaces(PLACES, 'name');
    const byPrice = sortPlaces(PLACES, 'price');

    expect(PLACES.map((place) => place.id)).toEqual(originalOrder);
    expect(byRating.map((place) => place.id)).toEqual([
      'pashupatinath-temple',
      'himalaya-java',
      'sarangkot-viewpoint',
      'thakali-kitchen',
    ]);
    expect(byName[0]?.id).toEqual('himalaya-java');
    expect(byPrice.map((place) => place.priceLevel)).toEqual([1, 1, 2, 3]);
  });
});

describe('placeFiltersSchema', () => {
  it('accepts a valid filter payload', () => {
    const parsed = placeFiltersSchema.safeParse({
      query: 'temple',
      category: 'heritage',
      minRating: 4,
      sort: 'rating',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        query: 'temple',
        category: 'heritage',
        minRating: 4,
        sort: 'rating',
      });
    }
  });

  it('coerces string ratings coming from form controls', () => {
    const parsed = placeFiltersSchema.safeParse({
      query: '',
      category: 'all',
      minRating: '4.5',
      sort: 'price',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.minRating).toBe(4.5);
    }
  });

  it('rejects an unknown sort value and an out-of-range rating', () => {
    const badSort = placeFiltersSchema.safeParse({
      query: '',
      category: 'all',
      minRating: 0,
      sort: 'distance',
    });
    const badRating = placeFiltersSchema.safeParse({
      query: '',
      category: 'all',
      minRating: 9,
      sort: 'rating',
    });

    expect(badSort.success).toBe(false);
    expect(badRating.success).toBe(false);
  });

  it('rejects a query longer than 80 characters', () => {
    const parsed = placeFiltersSchema.safeParse({
      query: 'a'.repeat(81),
      category: 'all',
      minRating: 0,
      sort: 'rating',
    });

    expect(parsed.success).toBe(false);
  });
});
