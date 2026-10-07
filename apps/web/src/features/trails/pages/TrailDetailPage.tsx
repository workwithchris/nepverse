import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  Coffee,
  Info,
  Map,
  Mountain,
} from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { useAllPlaces } from '@/features/places/api';
import { useTrail } from '@/features/trails/api';
import { DifficultyBadge } from '@/features/trails/components/DifficultyBadge';
import { findTrailStops } from '@/features/trails/components/trail-stops';
import { ErrorState } from '@/shared/components/ErrorState';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const TrailInteractiveMap = lazy(() =>
  import('@/features/trails/components/TrailInteractiveMap').then((module) => ({
    default: module.TrailInteractiveMap,
  })),
);

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-[440px] rounded-2xl sm:h-[560px]" />
    </div>
  );
}

function NotFoundBlock() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="font-mono text-sm text-muted-foreground">
        404 · trail not found
      </p>
      <p className="text-sm text-muted-foreground">
        This id is not part of the NepalVerse trails dataset.
      </p>
      <Button asChild variant="outline">
        <Link to="/trails">
          <ArrowLeft className="h-4 w-4" />
          Back to trails
        </Link>
      </Button>
    </div>
  );
}

export function TrailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { trail, isLoading, isError, refetch } = useTrail(id);
  const { data: places, isError: placesError } = useAllPlaces();
  const [showHighlights, setShowHighlights] = useState(true);
  const [showStays, setShowStays] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<{
    id: string;
    trailId: string;
  } | null>(null);
  const stops = useMemo(
    () => findTrailStops(trail?.geometry ?? [], places?.items ?? []),
    [trail, places],
  );
  const visibleStops = stops.filter((stop) =>
    stop.kind === 'highlight' ? showHighlights : showStays,
  );
  const highlights = stops.filter((stop) => stop.kind === 'highlight').length;

  if (isLoading) return <DetailSkeleton />;
  if (isError)
    return (
      <ErrorState
        title="Could not load this trail"
        message="The trails dataset did not load."
        onRetry={() => void refetch()}
      />
    );
  if (!trail) return <NotFoundBlock />;

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
        <div className="relative px-6 pt-6 pb-7 sm:px-9 sm:pt-8 sm:pb-9">
          <Link
            to="/trails"
            className="inline-flex items-center gap-2 rounded-sm text-xs font-medium text-white/70 transition-colors hover:text-white focus-visible:outline-[#a9d9c4]"
          >
            <ArrowLeft className="size-3.5" />
            All trails
          </Link>

          <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0 max-w-3xl">
              <p className="font-mono text-[11px] tracking-[0.22em] text-[#a9d9c4] uppercase">
                NepalVerse / trail atlas
              </p>
              <h1 className="mt-2 text-4xl leading-[1.08] font-semibold tracking-[-0.04em] text-balance sm:text-[3.5rem]">
                {trail.name}
              </h1>
              {trail.description ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
                  {trail.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1.5 text-[#14382f]">
                <DifficultyBadge difficulty={trail.difficulty} />
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-white/90">
                <CalendarDays className="size-3.5" />
                {trail.bestSeason}
              </span>
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-white/90">
                {trail.permitRequired
                  ? 'Permit flagged · verify'
                  : 'Verify permits locally'}
              </span>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/20 pt-6 sm:grid-cols-4">
            <div>
              <dt className="font-mono text-[10px] tracking-[0.15em] text-white/55 uppercase">
                Route distance
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {trail.distanceKm}{' '}
                <span className="text-base font-normal text-white/60">km</span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] tracking-[0.15em] text-white/55 uppercase">
                Estimated time
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {trail.days ?? '—'}{' '}
                <span className="text-base font-normal text-white/60">
                  days
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] tracking-[0.15em] text-white/55 uppercase">
                Mapped points
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {trail.geometry.length.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] tracking-[0.15em] text-white/55 uppercase">
                Elevation gain
              </dt>
              <dd
                className={cn(
                  'mt-1 font-semibold tracking-tight',
                  trail.elevationGainM == null
                    ? 'pt-1 text-base text-white/70'
                    : 'text-2xl tabular-nums sm:text-3xl',
                )}
              >
                {trail.elevationGainM == null ? (
                  'Not mapped'
                ) : (
                  <>
                    {trail.elevationGainM.toLocaleString()}{' '}
                    <span className="text-base font-normal text-white/60">
                      m
                    </span>
                  </>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section
        aria-label="Explore the trail"
        className="overflow-hidden rounded-2xl border bg-card shadow-[0_24px_60px_-48px_rgba(0,0,0,0.5)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e9f4ee] text-[#236447] dark:bg-[#19372b] dark:text-[#a9d9c4]">
              <Map className="size-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Explore the route</h2>
              <p className="text-xs text-muted-foreground">
                Navigate the trail and discover mapped places nearby
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-foreground" />
              Start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-culture" />
              Finish
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-stay" />
              Route
            </span>
          </div>
        </div>

        <div className="grid lg:h-[680px] lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside
            className="order-2 flex min-h-0 flex-col border-t bg-[#f7faf8] dark:bg-[#101a17] lg:order-1 lg:border-t-0 lg:border-r"
            aria-label="Places near the route"
          >
            <div className="border-b px-5 py-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-[#377456] uppercase dark:text-[#a9d9c4]">
                Field notes / nearby
              </p>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold tracking-tight">
                  Stops & shelters
                </h3>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {stops.length} mapped
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Selected places within 800 m of the mapped line.
              </p>
            </div>
            <div
              className="flex flex-wrap gap-2 border-b px-4 py-3"
              role="group"
              aria-label="Map layers"
            >
              <button
                type="button"
                aria-pressed={showHighlights}
                onClick={() => setShowHighlights(!showHighlights)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors',
                  showHighlights
                    ? 'bg-[#205d43] text-white'
                    : 'border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                <Mountain className="size-3.5" /> Highlights{' '}
                <span className="font-mono opacity-70">{highlights}</span>
              </button>
              <button
                type="button"
                aria-pressed={showStays}
                onClick={() => setShowStays(!showStays)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors',
                  showStays
                    ? 'bg-[#205d43] text-white'
                    : 'border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                <BedDouble className="size-3.5" /> Stays & tea houses{' '}
                <span className="font-mono opacity-70">
                  {stops.length - highlights}
                </span>
              </button>
            </div>

            {visibleStops.length ? (
              <ol className="max-h-80 min-h-0 flex-1 space-y-1 overflow-y-auto p-3 lg:max-h-none">
                {visibleStops.map(({ place, kind, distance }) => {
                  const Icon =
                    kind === 'highlight'
                      ? Mountain
                      : kind === 'tea house'
                        ? Coffee
                        : BedDouble;
                  return (
                    <li
                      key={place.id}
                      className={cn(
                        'group flex items-center gap-1 rounded-xl transition-colors',
                        selectedPlace?.trailId === trail.id &&
                          selectedPlace.id === place.id
                          ? 'bg-card shadow-sm ring-1 ring-border'
                          : 'hover:bg-card/80',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPlace({ id: place.id, trailId: trail.id })
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left"
                        aria-label={`Locate ${place.nameEn} on map`}
                      >
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-full',
                            kind === 'highlight'
                              ? 'bg-[#e4f3e7] text-[#287a43] dark:bg-[#203a28] dark:text-[#8bd49c]'
                              : kind === 'tea house'
                                ? 'bg-[#fff0d5] text-[#a96a00] dark:bg-[#3d301a] dark:text-[#f5b94f]'
                                : 'bg-[#e4efff] text-[#0070f3] dark:bg-[#18314e] dark:text-[#81b9ff]',
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {place.nameEn}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {kind === 'highlight'
                              ? 'Highlight'
                              : kind === 'tea house'
                                ? 'Tea house'
                                : 'Stay'}{' '}
                            · {distance.toFixed(1)} km off route
                          </span>
                        </span>
                      </button>
                      <Link
                        to={`/places/${place.id}`}
                        aria-label={`Details for ${place.nameEn}`}
                        title={`Details for ${place.nameEn}`}
                        className="mr-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ArrowUpRight className="size-4" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="flex-1 px-5 py-8 text-sm leading-6 text-muted-foreground">
                {placesError
                  ? 'Nearby places could not be loaded.'
                  : !places
                    ? 'Loading nearby places…'
                    : stops.length
                      ? 'Turn on a layer to see nearby places.'
                      : 'No mapped stops or stays found near this route.'}
              </p>
            )}
            <div className="flex items-start gap-2 border-t px-5 py-4 text-[11px] leading-5 text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Open map data, not verified trek stages or services. Check
                conditions locally before setting out.
              </p>
            </div>
          </aside>

          <div className="order-1 min-w-0 lg:order-2">
            <Suspense
              fallback={
                <Skeleton className="h-[440px] rounded-none sm:h-[560px] lg:h-full" />
              }
            >
              <TrailInteractiveMap
                geometry={trail.geometry}
                label={trail.name}
                stops={stops}
                showHighlights={showHighlights}
                showStays={showStays}
                selectedPlace={
                  selectedPlace?.trailId === trail.id ? selectedPlace : null
                }
              />
            </Suspense>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
          <span>
            Route endpoints reflect recorded geometry; confirm actual trailheads
            locally.
          </span>
          <span>
            Map data ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              OpenStreetMap contributors
            </a>
          </span>
        </div>
      </section>
    </div>
  );
}
