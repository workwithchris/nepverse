export type PlaceType =
  | 'heritage'
  | 'park'
  | 'restaurant'
  | 'cafe'
  | 'lodging'
  | 'homestay'
  | 'street_food'
  | 'viewpoint'
  | 'attraction'
  | 'trailhead';

export type PlaceStatus = 'open' | 'closed' | 'unknown';

export type PriceLevel = 1 | 2 | 3;

export interface SourceRef {
  source: string;
  url: string;
  license: string;
  attribution: string;
}

export interface Place {
  id: string;
  nameEn: string;
  nameNe?: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
  address?: string | null;
  openingHours?: string | null;
  priceLevel?: PriceLevel | null;
  rating?: number | null;
  reviewCount?: number | null;
  description?: string | null;
  tags: string[];
  wikidataId?: string | null;
  status: PlaceStatus;
  sources: SourceRef[];
}

export type TrailDifficulty = 'easy' | 'moderate' | 'hard' | 'extreme';

export interface Trail {
  id: string;
  name: string;
  distanceKm: number;
  elevationGainM?: number;
  difficulty: TrailDifficulty;
  bestSeason: string;
  permitRequired: boolean;
  days?: number;
  description?: string;
  geometry: [number, number][];
}

export interface PlacesResponse {
  items: Place[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TrailsResponse {
  items: Trail[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Stats {
  totalPlaces: number;
  totalTrails: number;
  byType: Record<string, number>;
  avgRating?: number | null;
  generatedAt: string;
}

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  heritage: 'Heritage',
  park: 'Park',
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  lodging: 'Lodging',
  homestay: 'Homestay',
  street_food: 'Street food',
  viewpoint: 'Viewpoint',
  attraction: 'Attraction',
  trailhead: 'Trailhead',
};

export const PLACE_TYPES: PlaceType[] = [
  'heritage',
  'park',
  'viewpoint',
  'attraction',
  'restaurant',
  'cafe',
  'street_food',
  'lodging',
  'homestay',
  'trailhead',
];

export const TRAIL_DIFFICULTY_LABELS: Record<TrailDifficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
  extreme: 'Extreme',
};
