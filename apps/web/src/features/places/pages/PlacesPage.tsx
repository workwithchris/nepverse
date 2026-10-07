import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { List, Map as MapIcon, RotateCcw } from 'lucide-react';
import { PLACE_TYPES } from '@/core/api/types';
import { useFiltersStore } from '@/core/stores/filters-store';
import { cn } from '@/core/lib/utils';
import { useAllPlaces } from '@/features/places/api';
import { DotMap } from '@/features/places/components/DotMap';
import {
  PlaceTable,
  PlaceTableSkeleton,
} from '@/features/places/components/PlaceTable';
import { PlaceToolbar } from '@/features/places/components/PlaceToolbar';
import { filterPlaces } from '@/features/places/lib/filter-places';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Pagination } from '@/shared/components/Pagination';
import { Button } from '@/shared/ui/button';

const PAGE_SIZE = 25;
type View = 'list' | 'map';

export function PlacesPage() {
  const filters = useFiltersStore();
  const { data, isLoading, isError, refetch } = useAllPlaces();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<View>('list');
  const [params, setParams] = useSearchParams();

  // Links like /places?category=park&q=temple preset the filters once.
  useEffect(() => {
    const q = params.get('q');
    const category = params.get('category');
    if (q === null && category === null) return;
    filters.setFilters({
      query: q ?? '',
      category:
        category && (PLACE_TYPES as string[]).includes(category)
          ? category
          : 'all',
    });
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const hasRatings = useMemo(
    () => items.some((place) => place.rating != null),
    [items],
  );
  const { query, category, minRating, sort } = filters;
  const effectiveMinRating = hasRatings ? minRating : 0;
  const scoped = useMemo(
    () =>
      filterPlaces(items, {
        query,
        category: 'all',
        minRating: effectiveMinRating,
        sort,
      }),
    [items, query, effectiveMinRating, sort],
  );
  const filtered = useMemo(
    () =>
      category === 'all'
        ? scoped
        : scoped.filter((place) => place.placeType === category),
    [scoped, category],
  );

  useEffect(() => {
    setPage(1);
  }, [query, category, minRating, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const first = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(first, first + PAGE_SIZE);
  const isFiltered =
    query !== '' || category !== 'all' || effectiveMinRating > 0;
  const categoryCount = useMemo(
    () => new Set(items.map((place) => place.placeType)).size,
    [items],
  );
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border bg-[#f0f5f0] dark:bg-[#14271f]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(#a8c3b31f 1px, transparent 1px), linear-gradient(90deg, #a8c3b31f 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6 px-6 py-7 sm:px-9 sm:py-8">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.22em] text-[#377456] uppercase dark:text-[#a9d9c4]">
              NepalVerse / gazetteer
            </p>
            <h1 className="mt-2 text-4xl leading-[1.08] font-semibold tracking-[-0.04em] sm:text-[3.5rem]">
              Places
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Temples, parks, viewpoints, food and places to stay. Search the
              atlas or browse places by category.
            </p>
          </div>
          <div className="flex min-w-48 items-end justify-between gap-5 rounded-xl bg-[#14382f] px-5 py-4 text-white">
            <div>
              <p className="font-mono text-[10px] tracking-[0.16em] text-white/60 uppercase">
                Places indexed
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {data ? data.total.toLocaleString() : '—'}
              </p>
              <p className="mt-1 text-xs text-white/65">
                {data ? `${categoryCount} categories` : 'Across Nepal'}
              </p>
            </div>
            <span
              className="mb-1 size-2 rounded-full bg-[#a9d9c4] ring-4 ring-[#a9d9c4]/15"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      <section
        aria-label="Browse places"
        className="overflow-hidden rounded-2xl border bg-card shadow-[0_24px_60px_-48px_rgba(0,0,0,0.5)]"
      >
        <div className="border-b bg-[#f7faf8] px-5 py-5 sm:px-6 dark:bg-[#101a17]">
          <p className="mb-3 font-mono text-[10px] tracking-[0.16em] text-[#377456] uppercase dark:text-[#a9d9c4]">
            Directory / search &amp; filter
          </p>
          <PlaceToolbar scoped={scoped} hasRatings={hasRatings} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-6">
          <p
            className="font-mono text-xs text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {data ? (
              <>
                {filtered.length > 0
                  ? `${(first + 1).toLocaleString()}–${(first + visible.length).toLocaleString()} of `
                  : ''}
                <span className="font-semibold text-foreground">
                  {filtered.length.toLocaleString()}
                </span>{' '}
                places
                {isFiltered
                  ? ` (filtered from ${data.total.toLocaleString()})`
                  : ''}
              </>
            ) : (
              'Loading…'
            )}
          </p>
          <div className="flex items-center gap-2">
            {isFiltered ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => filters.resetFilters()}
              >
                <RotateCcw className="size-3.5" />
                Clear filters
              </Button>
            ) : null}
            <div
              role="group"
              aria-label="View"
              className="flex rounded-full border bg-background p-0.5"
            >
              {(
                [
                  ['list', List, 'List'],
                  ['map', MapIcon, 'Map'],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => setView(value)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    view === value
                      ? 'bg-[#205d43] text-white'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 bg-[#f7faf8] p-4 dark:bg-[#101a17] sm:p-6">
          {isLoading ? <PlaceTableSkeleton rows={10} /> : null}

          {isError ? (
            <ErrorState
              title="Could not load places"
              message="The places dataset did not load. Check the data folder and retry."
              onRetry={() => void refetch()}
            />
          ) : null}

          {!isLoading && !isError && filtered.length === 0 ? (
            <EmptyState
              title="No places match these filters"
              description="Try a broader search term or pick another category."
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

          {filtered.length > 0 && view === 'list' ? (
            <>
              <PlaceTable places={visible} />
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={(next) => {
                  setPage(next);
                  window.scrollTo({ top: 0 });
                }}
              />
            </>
          ) : null}

          {filtered.length > 0 && view === 'map' ? (
            <figure className="overflow-hidden rounded-xl border bg-[#f7faf8] dark:bg-[#101a17]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <figcaption className="font-mono text-[10px] tracking-[0.16em] text-[#377456] uppercase dark:text-[#a9d9c4]">
                  Map / {filtered.length.toLocaleString()} plotted
                </figcaption>
                <span className="text-[11px] text-muted-foreground">
                  Each dot is one place, coloured by category group.
                </span>
              </div>
              <div className="p-3 sm:p-5">
                <DotMap places={filtered} />
              </div>
            </figure>
          ) : null}
        </div>
      </section>
    </div>
  );
}
