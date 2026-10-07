import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Footprints,
  Mountain,
  ShieldCheck,
} from 'lucide-react';
import { useTrail } from '@/features/trails/api';
import { DifficultyBadge } from '@/features/trails/components/DifficultyBadge';
import { TrailSparkline } from '@/features/trails/components/TrailSparkline';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mountain;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-sm tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-56" />
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
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/trails">
            <ArrowLeft className="h-4 w-4" />
            Back to trails
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={trail.difficulty} />
          <Badge variant={trail.permitRequired ? 'secondary' : 'outline'}>
            {trail.permitRequired ? 'Permit required' : 'No permit required'}
          </Badge>
          <Badge variant="outline">{trail.bestSeason}</Badge>
        </div>

        <PageHeader
          title={trail.name}
          description={trail.description}
          className="border-none pb-0"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem
          icon={Footprints}
          label="Distance"
          value={`${trail.distanceKm} km`}
        />
        <MetaItem
          icon={Mountain}
          label="Elevation gain"
          value={`${(trail.elevationGainM ?? 0).toLocaleString()} m`}
        />
        <MetaItem
          icon={CalendarDays}
          label="Typical duration"
          value={`${trail.days ?? 1} days`}
        />
        <MetaItem
          icon={ShieldCheck}
          label="Permit"
          value={trail.permitRequired ? 'Required' : 'Not required'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Route profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TrailSparkline geometry={trail.geometry} label={trail.name} />
          <div className="flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-4 rounded-full bg-primary" />
              Normalized polyline from {trail.geometry.length} recorded points
            </span>
            <span className="font-mono">id: {trail.id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
