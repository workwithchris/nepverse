import { useTrails } from '@/features/trails/api';
import { TrailCard } from '@/features/trails/components/TrailCard';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingGrid } from '@/shared/components/LoadingGrid';
import { PageHeader } from '@/shared/components/PageHeader';

export function TrailsPage() {
  const { data, isLoading, isError, refetch } = useTrails();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trails"
        description="Trekking routes and jungle walks with distance, difficulty and season at a glance."
        actions={
          data ? (
            <span className="text-sm text-muted-foreground tabular-nums">
              {data.total} routes
            </span>
          ) : null
        }
      />

      {isLoading ? <LoadingGrid count={3} /> : null}

      {isError ? (
        <ErrorState
          title="Could not load trails"
          message="The trails dataset did not load. Check the data folder and retry."
          onRetry={() => void refetch()}
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((trail) => (
            <TrailCard key={trail.id} trail={trail} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
