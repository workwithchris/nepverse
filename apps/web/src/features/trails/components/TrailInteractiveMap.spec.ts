import type { Place } from '@/core/api/types';
import { findTrailStops } from './trail-stops';

function place(
  id: string,
  nameEn: string,
  placeType: Place['placeType'],
  lng: number,
  lat: number,
): Place {
  return {
    id,
    nameEn,
    placeType,
    lng,
    lat,
    status: 'unknown',
    tags: [],
    sources: [],
  };
}

describe('nearby trail places', () => {
  it('finds mapped highlights and tea houses without treating gaps as trail', () => {
    const stops = findTrailStops(
      [
        [85.3, 27.7],
        [85.3002, 27.7002],
        [85.4, 27.8],
        [85.4002, 27.8002],
      ],
      [
        place('view', 'Lookout', 'viewpoint', 85.3001, 27.7002),
        place('tea', 'Mountain Tea House', 'street_food', 85.4001, 27.8002),
        place('gap', 'False stop', 'viewpoint', 85.35, 27.75),
        place('far', 'Far hotel', 'lodging', 85.5, 27.9),
      ],
    );

    expect(stops.map(({ place }) => place.id)).toEqual(['view', 'tea']);
    expect(stops[1].kind).toBe('tea house');
  });

  it('keeps highlights near the finish when many are mapped along a trail', () => {
    const geometry = Array.from(
      { length: 401 },
      (_, i) => [85 + i * 0.0001, 27.7] as [number, number],
    );
    const places = Array.from({ length: 20 }, (_, i) =>
      place(`stop-${i}`, `Viewpoint ${i}`, 'viewpoint', 85 + i * 0.002, 27.7),
    );

    const stops = findTrailStops(geometry, places);
    expect(stops.some((stop) => stop.progress > 340)).toBe(true);
  });
});
