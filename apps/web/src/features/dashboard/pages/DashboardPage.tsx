import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Info, Map } from 'lucide-react';
import type { Place, PlaceType } from '@/core/api/types';
import { cn } from '@/core/lib/utils';
import { useStats, useTopRatedPlaces } from '@/features/dashboard/api';
import { CategoryBreakdown } from '@/features/dashboard/components/CategoryBreakdown';
import { DotMap } from '@/features/places/components/DotMap';
import {
  PlaceTable,
  PlaceTableSkeleton,
} from '@/features/places/components/PlaceTable';
import { GROUP_ORDER, GROUP_STYLES } from '@/features/places/lib/groups';
import { ErrorState } from '@/shared/components/ErrorState';
import { Skeleton } from '@/shared/ui/skeleton';

const CONTOURS =
  'repeating-radial-gradient(ellipse at 94% 10%, transparent 0 35px, rgba(255,255,255,.18) 36px 37px)';

interface HeroStat {
  label: string;
  value: ReactNode;
  hint: string;
  muted?: boolean;
}

export function DashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useStats();
  const topPlaces = useTopRatedPlaces(8);
  const [activeTypes, setActiveTypes] = useState<PlaceType[] | null>(null);

  const allPlaces = topPlaces.data?.items;
  const coverage = useMemo(() => {
    if (!allPlaces?.length) return null;
    const share = (test: (place: Place) => boolean) =>
      Math.round((allPlaces.filter(test).length / allPlaces.length) * 100);
    return [
      { label: 'Address', value: share((p) => !!p.address) },
      { label: 'Opening hours', value: share((p) => !!p.openingHours) },
      { label: 'Nepali name', value: share((p) => !!p.nameNe) },
      { label: 'Description', value: share((p) => !!p.description) },
      { label: 'Rating', value: share((p) => p.rating != null) },
    ];
  }, [allPlaces]);

  const categoryCount = stats ? Object.keys(stats.byType).length : 0;
  const avgRating = stats?.avgRating != null ? stats.avgRating.toFixed(2) : '—';
  const hasRatings = topPlaces.topPlaces[0]?.rating != null;

  const heroStats: HeroStat[] = [
    {
      label: 'Total places',
      value: stats
        ? stats.totalPlaces.toLocaleString()
        : statsLoading
          ? '…'
          : '—',
      hint: 'Heritage, parks, food, lodging',
    },
    {
      label: 'Categories',
      value: stats ? categoryCount : '…',
      hint: 'Distinct place types',
    },
    {
      label: 'Trails',
      value: stats ? stats.totalTrails.toLocaleString() : '…',
      hint: stats?.totalTrails === 0 ? 'None exported yet' : 'Routes and walks',
    },
    {
      label: 'Average rating',
      value: avgRating,
      hint: stats?.avgRating == null ? 'No ratings collected yet' : 'Out of 5',
      muted: stats?.avgRating == null,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-[#14382f] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ backgroundImage: CONTOURS }}
        />
        <div className="relative px-6 pt-7 pb-7 sm:px-9 sm:pt-9 sm:pb-9">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl min-w-0">
              <p className="font-mono text-[11px] tracking-[0.22em] text-[#a9d9c4] uppercase">
                NepalVerse / field atlas
              </p>
              <h1 className="mt-2 text-4xl leading-[1.08] font-semibold tracking-[-0.04em] text-balance sm:text-[3.5rem]">
                Nepal, place by place
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
                Every place in the dataset, drawn where it stands. Pick a
                category to see where it clusters.
              </p>
            </div>
            {stats ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white/90">
                <CalendarDays className="size-3.5" />
                Updated {new Date(stats.generatedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/20 pt-6 sm:grid-cols-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <dt className="font-mono text-[10px] tracking-[0.15em] text-white/55 uppercase">
                  {stat.label}
                </dt>
                <dd
                  className={cn(
                    'mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl',
                    stat.muted && 'text-white/60',
                  )}
                >
                  {stat.value}
                </dd>
                <dd className="mt-0.5 text-xs text-white/55">{stat.hint}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {statsError ? (
        <ErrorState
          title="Could not load statistics"
          message="The stats dataset did not load."
          onRetry={() => void refetchStats()}
        />
      ) : null}

      <section
        aria-label="Place atlas"
        className="overflow-hidden rounded-2xl border bg-card shadow-[0_24px_60px_-48px_rgba(0,0,0,0.5)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e9f4ee] text-[#236447] dark:bg-[#19372b] dark:text-[#a9d9c4]">
              <Map className="size-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Place atlas</h2>
              <p className="text-xs text-muted-foreground">
                Hover or focus a category to isolate it on the map
              </p>
            </div>
          </div>
          <ul
            className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex"
            aria-label="Map legend"
          >
            {GROUP_ORDER.map((group) => (
              <li key={group} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn('size-2 rounded-full', GROUP_STYLES[group].bg)}
                />
                {GROUP_STYLES[group].label}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="relative min-w-0 bg-[#eef5f8] p-3 sm:p-6 dark:bg-[#0f1c21]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-30"
              style={{
                backgroundImage:
                  'repeating-radial-gradient(ellipse at 12% 88%, transparent 0 46px, rgba(74,132,160,.16) 47px 48px)',
              }}
            />
            <div className="relative">
              {allPlaces ? (
                <DotMap places={allPlaces} activeTypes={activeTypes} />
              ) : topPlaces.isError ? (
                <p className="flex aspect-[1.73] items-center justify-center text-sm text-muted-foreground">
                  Map unavailable. Retry loading places below.
                </p>
              ) : (
                <Skeleton className="aspect-[1.73] bg-[#dbe9ef] dark:bg-[#1a2c33]" />
              )}
            </div>
            {allPlaces ? (
              <p className="relative mt-3 font-mono text-[10px] tracking-[0.15em] text-[#4a84a0] uppercase dark:text-[#8fc1d8]">
                {allPlaces.length.toLocaleString()} plotted coordinates
              </p>
            ) : null}
          </div>

          <aside
            aria-label="Category breakdown"
            className="flex min-h-0 flex-col border-t bg-[#f7faf8] lg:border-t-0 lg:border-l dark:bg-[#101a17]"
          >
            <div className="border-b px-5 py-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-[#377456] uppercase dark:text-[#a9d9c4]">
                Legend / categories
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">
                What is mapped
              </h3>
            </div>
            <div className="min-h-0 flex-1 px-5 py-4 lg:max-h-[34rem] lg:overflow-y-auto">
              {stats ? (
                <CategoryBreakdown
                  byType={stats.byType}
                  onActiveChange={setActiveTypes}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {statsLoading ? 'Loading…' : 'No statistics available.'}
                </p>
              )}
            </div>
          </aside>
        </div>

        {coverage ? (
          <div className="border-t px-5 py-5 sm:px-6">
            <p className="font-mono text-[10px] tracking-[0.16em] text-[#377456] uppercase dark:text-[#a9d9c4]">
              Field notes / data coverage
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Share of places that have each field filled in.
            </p>
            <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
              {coverage.map((item) => (
                <li key={item.label} className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium tabular-nums">
                      {item.value}%
                    </span>
                  </div>
                  <div
                    className="h-1 overflow-hidden rounded-full bg-secondary"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-[#205d43] dark:bg-[#a9d9c4]"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-start gap-2 border-t px-5 py-3 text-[11px] leading-5 text-muted-foreground sm:px-6">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Positions come from open map data; points outside Nepal’s bounding
            box are not drawn.
          </p>
        </div>
      </section>

      <section className="space-y-3 pt-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-[#377456] uppercase dark:text-[#a9d9c4]">
              Gazetteer
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
              {hasRatings ? 'Top rated places' : 'Places'}
            </h2>
          </div>
          <Link
            to="/places"
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[#205d43] hover:text-foreground"
          >
            View all places
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {topPlaces.isLoading ? <PlaceTableSkeleton rows={8} /> : null}
        {topPlaces.isError ? (
          <ErrorState
            title="Could not load places"
            message="The places dataset did not load."
            onRetry={() => void topPlaces.refetch()}
          />
        ) : null}
        {topPlaces.topPlaces.length > 0 ? (
          <PlaceTable places={topPlaces.topPlaces} />
        ) : null}
      </section>
    </div>
  );
}
