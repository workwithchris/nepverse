import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/core/api/http';
import type { Trail, TrailsResponse } from '@/core/api/types';

export function useTrails() {
  return useQuery({
    queryKey: ['trails'],
    queryFn: () => fetchJson<TrailsResponse>('/trails.json'),
  });
}

export function useTrail(id: string | undefined) {
  const query = useTrails();
  const trail = useMemo<Trail | null>(
    () => query.data?.items.find((item) => item.id === id) ?? null,
    [query.data, id],
  );

  return { ...query, trail };
}
