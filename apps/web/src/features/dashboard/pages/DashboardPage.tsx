import { LayoutGrid, MapPin, Route, Star } from 'lucide-react';
import { useStats, useTopRatedPlaces } from '@/features/dashboard/api';
import { CategoryBreakdown } from '@/features/dashboard/components/CategoryBreakdown';
import { useTrails } from '@/features/trails/api';
import { PlaceCard } from '@/features/places/components/PlaceCard';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingGrid } from '@/shared/components/LoadingGrid';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

export function DashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useStats();
  const topPlaces = useTopRatedPlaces(6);
  const trails = useTrails();

  const categoryCount = stats ? Object.keys(stats.byType).length : 0;
  const avgRating = stats?.avgRating != null ? stats.avgRating.toFixed(2) : '—';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="A snapshot of the scraped Nepal travel dataset: places, categories, trails and ratings."
        actions={
          stats ? (
            <span className="font-mono text-xs text-muted-foreground">
              generated {new Date(stats.generatedAt).toLocaleDateString()}
            </span>
          ) : null
        }
      />

      {statsError ? (
        <ErrorState
          title="Could not load statistics"
          message="The stats dataset did not load."
          onRetry={() => void refetchStats()}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total places"
          value={stats ? stats.totalPlaces : statsLoading ? '…' : '—'}
          hint="Heritage, parks, food, lodging and more"
          icon={MapPin}
        />
        <StatCard
          label="Categories"
          value={stats ? categoryCount : '…'}
          hint="Distinct place types in the dataset"
          icon={LayoutGrid}
        />
        <StatCard
          label="Trails"
          value={trails.data ? trails.data.total : '…'}
          hint="Trekking routes and walks"
          icon={Route}
        />
        <StatCard
          label="Average rating"
          value={avgRating}
          hint="Mean of rated places, out of 5"
          icon={Star}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="flex items-end justify-between border-b pb-3">
            <h2 className="text-sm font-medium">Top rated places</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {topPlaces.topPlaces.length} shown
            </span>
          </div>
          {topPlaces.isLoading ? <LoadingGrid count={3} /> : null}
          {topPlaces.isError ? (
            <ErrorState
              title="Could not load places"
              message="The places dataset did not load."
              onRetry={() => void topPlaces.refetch()}
            />
          ) : null}
          {topPlaces.topPlaces.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {topPlaces.topPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between border-b pb-3">
            <h2 className="text-sm font-medium">Category breakdown</h2>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Places per category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <CategoryBreakdown byType={stats.byType} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {statsLoading ? 'Loading…' : 'No statistics available.'}
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
