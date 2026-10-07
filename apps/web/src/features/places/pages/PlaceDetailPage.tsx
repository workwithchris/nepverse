import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Coins, MapPin, Navigation } from 'lucide-react';
import { PLACE_TYPE_LABELS, type Place } from '@/core/api/types';
import { usePlace } from '@/features/places/api';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { RatingStars } from '@/shared/components/RatingStars';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

const PRICE_LABELS: Record<number, string> = {
  1: '$ · budget',
  2: '$$ · mid-range',
  3: '$$$ · premium',
};

function MetaItem({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={
            mono ? 'truncate font-mono text-sm tabular-nums' : 'text-sm'
          }
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}

function NotFoundBlock() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="font-mono text-sm text-muted-foreground">
        404 · place not found
      </p>
      <p className="text-sm text-muted-foreground">
        This id is not part of the NepalVerse places dataset.
      </p>
      <Button asChild variant="outline">
        <Link to="/places">
          <ArrowLeft className="h-4 w-4" />
          Back to places
        </Link>
      </Button>
    </div>
  );
}

function SourceList({ place }: { place: Place }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Sources &amp; licensing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {place.sources.map((source) => (
          <div key={source.url} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                {source.source}
              </a>
              <Badge variant="outline" className="font-mono text-[11px]">
                {source.license}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {source.attribution}
            </p>
          </div>
        ))}
        <p className="border-t pt-3 text-xs text-muted-foreground">
          Aggregated from the sources above. Reuse requires following each
          source&apos;s license terms.
        </p>
      </CardContent>
    </Card>
  );
}

export function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { place, isLoading, isError, refetch } = usePlace(id);

  if (isLoading) return <DetailSkeleton />;
  if (isError)
    return (
      <ErrorState
        title="Could not load this place"
        message="The places dataset did not load."
        onRetry={() => void refetch()}
      />
    );
  if (!place) return <NotFoundBlock />;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/places">
            <ArrowLeft className="h-4 w-4" />
            Back to places
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {PLACE_TYPE_LABELS[place.placeType]}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {place.status}
          </Badge>
        </div>

        <PageHeader
          title={place.nameEn}
          description={place.nameNe ?? place.address ?? undefined}
          className="border-none pb-0"
          actions={
            <RatingStars rating={place.rating} count={place.reviewCount} />
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem
          icon={Clock}
          label="Opening hours"
          value={place.openingHours ?? 'Not recorded'}
        />
        <MetaItem
          icon={Coins}
          label="Price level"
          value={
            place.priceLevel ? PRICE_LABELS[place.priceLevel] : 'Not recorded'
          }
        />
        <MetaItem
          icon={Navigation}
          label="Coordinates"
          value={`${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`}
          mono
        />
        <MetaItem
          icon={MapPin}
          label="Address"
          value={place.address ?? 'Not recorded'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-3">
            <h2 className="text-sm font-medium">About</h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              {place.description ??
                'No description has been recorded for this place yet.'}
            </p>
          </section>

          {place.tags.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {place.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Dataset id</h2>
            <p className="font-mono text-sm text-muted-foreground">
              {place.id}
            </p>
          </section>
        </div>

        <SourceList place={place} />
      </div>
    </div>
  );
}
