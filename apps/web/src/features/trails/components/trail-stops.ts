import type { Place } from '@/core/api/types';
import { distanceKm } from '@/features/places/lib/groups';
import { isTrailGap } from './TrailSparkline';

export interface TrailStop {
  place: Place;
  kind: 'highlight' | 'stay' | 'tea house';
  progress: number;
  distance: number;
}

export function findTrailStops(
  geometry: [number, number][],
  places: Place[],
): TrailStop[] {
  if (geometry.length < 2) return [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lng, lat] of geometry) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  const segments = new Map<string, number[]>();
  for (let i = 1; i < geometry.length; i++) {
    const a = geometry[i - 1];
    const b = geometry[i];
    if (isTrailGap(a, b)) continue;
    for (
      let x = Math.floor(Math.min(a[0], b[0]) * 100);
      x <= Math.floor(Math.max(a[0], b[0]) * 100);
      x++
    ) {
      for (
        let y = Math.floor(Math.min(a[1], b[1]) * 100);
        y <= Math.floor(Math.max(a[1], b[1]) * 100);
        y++
      ) {
        const key = `${x},${y}`;
        const bucket = segments.get(key) ?? [];
        bucket.push(i);
        segments.set(key, bucket);
      }
    }
  }

  const nearby: TrailStop[] = [];
  for (const place of places) {
    const teaHouse = /\btea[\s-]*house\b/i.test(place.nameEn);
    const stay =
      place.placeType === 'lodging' || place.placeType === 'homestay';
    const highlight = ['attraction', 'viewpoint', 'park', 'trailhead'].includes(
      place.placeType,
    );
    if ((!teaHouse && !stay && !highlight) || place.status === 'closed')
      continue;
    const cos = Math.cos((place.lat * Math.PI) / 180);
    if (
      place.lat < minLat - 0.01 ||
      place.lat > maxLat + 0.01 ||
      place.lng < minLng - 0.01 / cos ||
      place.lng > maxLng + 0.01 / cos
    )
      continue;

    let best = 0.8 ** 2;
    let progress = -1;
    const adjacent = new Set<number>();
    const x = Math.floor(place.lng * 100);
    const y = Math.floor(place.lat * 100);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const index of segments.get(`${x + dx},${y + dy}`) ?? []) {
          adjacent.add(index);
        }
      }
    }
    for (const i of adjacent) {
      const a = geometry[i - 1];
      const b = geometry[i];
      if (
        place.lat < Math.min(a[1], b[1]) - 0.008 ||
        place.lat > Math.max(a[1], b[1]) + 0.008 ||
        place.lng < Math.min(a[0], b[0]) - 0.008 / cos ||
        place.lng > Math.max(a[0], b[0]) + 0.008 / cos
      )
        continue;
      const localX = (place.lng - a[0]) * cos * 111.2;
      const localY = (place.lat - a[1]) * 111.2;
      const dx = (b[0] - a[0]) * cos * 111.2;
      const dy = (b[1] - a[1]) * 111.2;
      const t = Math.max(
        0,
        Math.min(1, (localX * dx + localY * dy) / (dx * dx + dy * dy || 1)),
      );
      const squared = (localX - t * dx) ** 2 + (localY - t * dy) ** 2;
      if (squared < best) {
        best = squared;
        progress = i - 1 + t;
      }
    }
    if (progress !== -1)
      nearby.push({
        place,
        kind: teaHouse ? 'tea house' : stay ? 'stay' : 'highlight',
        progress,
        distance: Math.sqrt(best),
      });
  }

  // Spread markers across the recorded route rather than crowding a single village.
  const select = (items: TrailStop[], limit: number) => {
    const buckets = new Map<number, TrailStop>();
    for (const item of items) {
      const slot = Math.min(
        limit - 1,
        Math.floor((item.progress / (geometry.length - 1)) * limit),
      );
      const current = buckets.get(slot);
      if (
        !current ||
        (item.kind === 'tea house' && current.kind !== 'tea house') ||
        (item.kind === current.kind && item.distance < current.distance)
      )
        buckets.set(slot, item);
    }
    const selected: TrailStop[] = [];
    for (const item of [...buckets.values()].sort(
      (a, b) => a.progress - b.progress,
    )) {
      if (selected.length === limit) break;
      if (selected.some((other) => distanceKm(other.place, item.place) < 0.4))
        continue;
      selected.push(item);
    }
    return selected;
  };
  return [
    ...select(
      nearby.filter((item) => item.kind === 'highlight'),
      8,
    ),
    ...select(
      nearby.filter((item) => item.kind !== 'highlight'),
      12,
    ),
  ].sort((a, b) => a.progress - b.progress);
}
