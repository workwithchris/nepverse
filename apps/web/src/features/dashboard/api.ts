import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/core/api/http';
import type { Place, Stats } from '@/core/api/types';
import { useAllPlaces } from '@/features/places/api';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => fetchJson<Stats>('/stats.json'),
  });
}

export function useTopRatedPlaces(limit = 6) {
  const query = useAllPlaces();

  const topPlaces = useMemo<Place[]>(() => {
    const items = query.data?.items ?? [];
    return [...items]
      .sort(
        (a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) || a.nameEn.localeCompare(b.nameEn),
      )
      .slice(0, limit);
  }, [query.data, limit]);

  return { ...query, topPlaces };
}
