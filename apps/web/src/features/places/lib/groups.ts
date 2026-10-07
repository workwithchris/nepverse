import type { PlaceType } from '@/core/api/types';

export type PlaceGroup = 'culture' | 'nature' | 'stay' | 'eat';

export const GROUP_STYLES: Record<
  PlaceGroup,
  { label: string; cssVar: string; bg: string }
> = {
  culture: { label: 'Culture', cssVar: '--culture', bg: 'bg-culture' },
  nature: { label: 'Nature', cssVar: '--nature', bg: 'bg-nature' },
  stay: { label: 'Stay', cssVar: '--stay', bg: 'bg-stay' },
  eat: { label: 'Eat & drink', cssVar: '--eat', bg: 'bg-eat' },
};

export const GROUP_ORDER: PlaceGroup[] = ['culture', 'nature', 'stay', 'eat'];

export const GROUP_OF: Record<PlaceType, PlaceGroup> = {
  heritage: 'culture',
  attraction: 'culture',
  park: 'nature',
  viewpoint: 'nature',
  trailhead: 'nature',
  lodging: 'stay',
  homestay: 'stay',
  restaurant: 'eat',
  cafe: 'eat',
  street_food: 'eat',
};

/** Turns raw OSM-style tags ("amenity=place_of_worship") into readable words. */
export function readableTags(tags: string[], limit?: number): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    const [key, value] = tag.split('=');
    if (!value || value === 'yes' || value === 'no' || key.startsWith('name'))
      continue;
    const readable = value
      .replace(/^\[|\]$/g, '')
      .replace(/['"]/g, '')
      .replace(/_/g, ' ')
      .replace(/,\s*/g, ', ')
      .trim();
    if (readable) seen.add(readable);
  }
  const all = [...seen];
  return limit ? all.slice(0, limit) : all;
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
