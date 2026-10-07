import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/core/api/http';
import type { Place, PlacesResponse } from '@/core/api/types';

export function useAllPlaces() {
  return useQuery({
    queryKey: ['places'],
    queryFn: () => fetchJson<PlacesResponse>('/places.json'),
  });
}

export function usePlace(id: string | undefined) {
  const query = useAllPlaces();
  const place = useMemo<Place | null>(
    () => query.data?.items.find((item) => item.id === id) ?? null,
    [query.data, id],
  );

  return { ...query, place };
}
