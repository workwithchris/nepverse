import { useEffect, useMemo, useState } from 'react';
import { useFiltersStore } from '@/core/stores/filters-store';
import { useAllPlaces } from '@/features/places/api';
import { PlaceCard } from '@/features/places/components/PlaceCard';
import { PlaceFilterForm } from '@/features/places/components/PlaceFilterForm';
import { filterPlaces } from '@/features/places/lib/filter-places';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingGrid } from '@/shared/components/LoadingGrid';
import { PageHeader } from '@/shared/components/PageHeader';
import { Pagination } from '@/shared/components/Pagination';
import { Button } from '@/shared/ui/button';

const PAGE_SIZE = 9;

export function PlacesPage() {
  const filters = useFiltersStore();
  const { data, isLoading, isError, refetch } = useAllPlaces();
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => filterPlaces(data?.items ?? [], filters),
    [data, filters],
  );

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Places"
        description="Temples, parks, viewpoints, restaurants and places to stay across Nepal."
        actions={
          data ? (
            <span className="text-sm text-muted-foreground tabular-nums">
              {filtered.length} / {data.total} results
            </span>
          ) : null
        }
      />

      <PlaceFilterForm />

      {isLoading ? <LoadingGrid count={6} /> : null}

      {isError ? (
        <ErrorState
          title="Could not load places"
          message="The places dataset did not load. Check the data folder and retry."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && visible.length === 0 ? (
        <EmptyState
          title="No places match these filters"
          description="Try a broader search term or lower the minimum rating."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => filters.resetFilters()}
            >
              Clear filters
            </Button>
          }
        />
      ) : null}

      {visible.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}
