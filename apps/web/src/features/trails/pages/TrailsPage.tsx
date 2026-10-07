import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { TrailDifficulty } from '@/core/api/types';
import { cn } from '@/core/lib/utils';
import { useTrails } from '@/features/trails/api';
import { TrailCard } from '@/features/trails/components/TrailCard';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingGrid } from '@/shared/components/LoadingGrid';
import { Button } from '@/shared/ui/button';

const DIFFICULTIES: ('all' | TrailDifficulty)[] = [
  'all',
  'easy',
  'moderate',
  'hard',
  'extreme',
];

export function TrailsPage() {
  const { data, isLoading, isError, refetch } = useTrails();
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'all' | TrailDifficulty>('all');
  const filtered = data?.items.filter(
    (trail) =>
      (difficulty === 'all' || trail.difficulty === difficulty) &&
      trail.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const isFiltered = query.trim() !== '' || difficulty !== 'all';

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-[#14382f] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'repeating-radial-gradient(ellipse at 94% 10%, transparent 0 35px, rgba(255,255,255,.18) 36px 37px)',
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-8 px-6 py-9 sm:px-9 sm:py-11">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.22em] text-[#a9d9c4] uppercase">
              NepalVerse / trail atlas
            </p>
            <h1 className="mt-2 text-4xl leading-[1.08] font-semibold tracking-[-0.04em] sm:text-[3.5rem]">
              Trails
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
              Trekking routes and short walks, traced across Nepal. Find a
              route, then explore its map and nearby places.
            </p>
          </div>
          <div className="min-w-40 rounded-xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="font-mono text-[10px] tracking-[0.16em] text-white/60 uppercase">
              Routes mapped
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
              {data ? data.total.toLocaleString() : '—'}
            </p>
            <p className="mt-1 text-xs text-white/60">From open map data</p>
          </div>
        </div>
      </section>

      <section aria-label="Browse trails" className="space-y-5">
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <label
                htmlFor="trail-search"
                className="mb-2 block font-mono text-[10px] tracking-[0.16em] text-[#377456] uppercase dark:text-[#a9d9c4]"
              >
                Find a route
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="trail-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search trails by name"
                  className="h-10 w-full rounded-lg border bg-background pr-10 pl-9 text-sm placeholder:text-muted-foreground"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="Clear trail search"
                    onClick={() => setQuery('')}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-[#377456] uppercase dark:text-[#a9d9c4]">
                Difficulty
              </p>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Filter by difficulty"
              >
                {DIFFICULTIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={difficulty === level}
                    onClick={() => setDifficulty(level)}
                    className={cn(
                      'rounded-full px-3 py-2 text-xs font-medium capitalize transition-colors',
                      difficulty === level
                        ? 'bg-[#205d43] text-white'
                        : 'border bg-background text-muted-foreground hover:border-[#205d43] hover:text-foreground',
                    )}
                  >
                    {level === 'all' ? 'All routes' : level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isError ? (
          <ErrorState
            title="Could not load trails"
            message="The trails dataset did not load. Check the data folder and retry."
            onRetry={() => void refetch()}
          />
        ) : null}
        {isLoading ? <LoadingGrid count={3} /> : null}

        {data && data.items.length === 0 ? (
          <EmptyState
            title="No trails exported yet"
            description="Routes show up here once the scraper writes trails.json."
          />
        ) : null}

        {filtered && data && data.items.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                className="font-mono text-xs text-muted-foreground tabular-nums"
                aria-live="polite"
              >
                <span className="font-semibold text-foreground">
                  {filtered.length.toLocaleString()}
                </span>{' '}
                {filtered.length === 1 ? 'route' : 'routes'}
                {isFiltered ? ` of ${data.total.toLocaleString()}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {filtered.length > 0 ? (
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Map tiles © OpenStreetMap contributors
                  </a>
                ) : null}
                {isFiltered ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery('');
                      setDifficulty('all');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </div>
            {filtered.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((trail) => (
                  <TrailCard key={trail.id} trail={trail} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No routes match"
                description="Try a different name or difficulty level."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery('');
                      setDifficulty('all');
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
