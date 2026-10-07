import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Info,
  Map as MapIcon,
  MapPin,
  Navigation,
} from 'lucide-react';
import { PLACE_TYPE_LABELS, type Place } from '@/core/api/types';
import { cn } from '@/core/lib/utils';
import { useAllPlaces, usePlace } from '@/features/places/api';
import { PlaceTable } from '@/features/places/components/PlaceTable';
import {
  distanceKm,
  GROUP_OF,
  GROUP_STYLES,
  readableTags,
} from '@/features/places/lib/groups';
import { ErrorState } from '@/shared/components/ErrorState';
import { RatingStars } from '@/shared/components/RatingStars';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const PlaceMap = lazy(() =>
  import('@/features/places/components/PlaceMap').then((module) => ({
    default: module.PlaceMap,
  })),
);

const PRICE_LABELS: Record<number, string> = {
  1: '$ · budget',
  2: '$$ · mid-range',
  3: '$$$ · premium',
};

const NOT_RECORDED = 'Not recorded';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

const KICKER =
  'font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase';

function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function formatLat(lat: number) {
  return `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
}

function formatLng(lng: number) {
  return `${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? 'E' : 'W'}`;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-[600px] rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function NotFoundBlock() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-mono text-sm text-muted-foreground">
        404 · place not found
      </h1>
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

function CopyCoordinates({ place }: { place: Place }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${place.lat}, ${place.lng}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      {copied ? <Check /> : <Copy />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy coordinates'}</span>
    </Button>
  );
}

function PlacePhoto({ place }: { place: Place }) {
  const [failed, setFailed] = useState(false);
  if (!place.imageUrl) return null;
  const linkClass = cn(
    'rounded-sm underline-offset-2 hover:text-foreground hover:underline',
    FOCUS_RING,
  );
  return (
    <figure className="border-b">
      {failed ? (
        <div className="flex aspect-[16/10] items-center justify-center bg-muted text-sm text-muted-foreground">
          Photo unavailable
        </div>
      ) : (
        <img
          src={place.imageUrl}
          alt={place.nameEn}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={() => setFailed(true)}
          className="aspect-[16/10] w-full bg-muted object-cover"
        />
      )}
      {!failed ? (
        <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2.5 text-[11px] leading-5 text-muted-foreground">
          <span className="min-w-0">
            Photo: {place.imageAuthor ?? 'Unknown author'}
            {place.imageAttribution ? ` · ${place.imageAttribution}` : ''}
          </span>
          <span className="inline-flex items-center gap-3">
            {place.imageLicense ? (
              place.imageLicenseUrl ? (
                <a
                  href={place.imageLicenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  {place.imageLicense}
                </a>
              ) : (
                <span>{place.imageLicense}</span>
              )
            ) : null}
            {place.imagePageUrl ? (
              <a
                href={place.imagePageUrl}
                target="_blank"
                rel="noreferrer"
                className={cn('inline-flex items-center gap-1', linkClass)}
              >
                Wikimedia Commons
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ) : null}
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}

function Identity({ place }: { place: Place }) {
  const group = GROUP_STYLES[GROUP_OF[place.placeType]];
  const sourceUrl = place.sources[0]?.url;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`;
  const hasPhoto = Boolean(place.imageUrl);

  return (
    <div className="flex flex-1 flex-col px-5 py-6 sm:px-6">
      {hasPhoto ? null : (
        <div
          aria-hidden="true"
          className={cn('mb-5 h-1.5 w-16 rounded-full', group.bg)}
        />
      )}
      <p className={KICKER}>Place explorer · {group.label}</p>
      <h1 className="mt-2 text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
        {place.nameEn}
      </h1>
      {place.nameNe ? (
        <p lang="ne" className="mt-2 text-lg leading-7 text-muted-foreground">
          {place.nameNe}
        </p>
      ) : null}
      {place.address ? (
        <p className="mt-2 flex items-start gap-1.5 text-sm leading-6 text-muted-foreground">
          <MapPin className="mt-1 size-3.5 shrink-0" aria-hidden="true" />
          {place.address}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium">
          <span
            className={cn('size-2 rounded-full', group.bg)}
            aria-hidden="true"
          />
          {PLACE_TYPE_LABELS[place.placeType]}
        </span>
        {place.status !== 'unknown' ? (
          <span className="rounded-full border px-3 py-1.5 capitalize">
            {place.status}
          </span>
        ) : null}
        {place.rating != null ? (
          <span className="rounded-full border px-3 py-1.5">
            <RatingStars rating={place.rating} count={place.reviewCount} />
          </span>
        ) : null}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border text-sm">
        {[
          ['Latitude', formatLat(place.lat)],
          ['Longitude', formatLng(place.lng)],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-3 py-2.5">
            <dt className={KICKER}>{label}</dt>
            <dd className="mt-0.5 font-mono text-[13px] tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 lg:mt-auto lg:pt-5">
        <CopyCoordinates key={place.id} place={place} />
        {sourceUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink />
              View source
            </a>
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="sm">
          <a href={osmUrl} target="_blank" rel="noreferrer">
            <MapIcon />
            Open in OSM
          </a>
        </Button>
      </div>
    </div>
  );
}

function FieldRecord({ place, tags }: { place: Place; tags: string[] }) {
  const details: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Address', value: place.address ?? NOT_RECORDED },
    { label: 'Opening hours', value: place.openingHours ?? NOT_RECORDED },
    {
      label: 'Price level',
      value: place.priceLevel ? PRICE_LABELS[place.priceLevel] : NOT_RECORDED,
    },
    {
      label: 'Coordinates',
      value: `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`,
      mono: true,
    },
    { label: 'Description', value: place.description ?? NOT_RECORDED },
    { label: 'Dataset id', value: place.id, mono: true },
  ];

  return (
    <section
      aria-labelledby="field-record-heading"
      className="min-w-0 rounded-2xl border bg-card px-5 py-5 sm:px-6"
    >
      <p className={KICKER}>Field record</p>
      <h2
        id="field-record-heading"
        className="mt-1 text-lg font-semibold tracking-tight"
      >
        Details
      </h2>
      <dl className="mt-3 divide-y divide-dashed border-y border-dashed text-sm">
        {details.map((detail) => {
          const missing = detail.value === NOT_RECORDED;
          return (
            <div
              key={detail.label}
              className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]"
            >
              <dt className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase sm:pt-px">
                {detail.label}
              </dt>
              <dd
                className={cn(
                  'min-w-0 leading-6 break-words',
                  detail.mono && 'font-mono text-[13px] tabular-nums',
                  missing && 'text-muted-foreground/70 italic',
                )}
              >
                {detail.value}
              </dd>
            </div>
          );
        })}
      </dl>
      {tags.length > 0 ? (
        <div className="mt-5">
          <h3 className={KICKER}>Mapped tags</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tags">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Sources({ place }: { place: Place }) {
  return (
    <aside
      aria-labelledby="sources-heading"
      className="flex min-w-0 flex-col rounded-2xl border bg-card"
    >
      <div className="flex-1 px-5 py-5">
        <p className={KICKER}>Provenance</p>
        <h2
          id="sources-heading"
          className="mt-1 text-lg font-semibold tracking-tight"
        >
          Sources
        </h2>
        <ul className="mt-3 space-y-3">
          {place.sources.map((source) => (
            <li key={`${source.source}:${source.url}`} className="text-sm">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm font-medium hover:underline',
                  FOCUS_RING,
                )}
              >
                {source.source.toUpperCase()}
                <ExternalLink
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </a>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {source.attribution} · {source.license}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-start gap-2 border-t px-5 py-4 text-[11px] leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <p>Reuse requires following each source&apos;s license terms.</p>
      </div>
    </aside>
  );
}

export function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { place, isLoading, isError, refetch } = usePlace(id);
  const all = useAllPlaces().data?.items;

  const nearby = useMemo(() => {
    if (!place || !all) return [];
    return all
      .filter((other) => other.id !== place.id)
      .map((other) => ({ other, km: distanceKm(place, other) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 6);
  }, [place, all]);

  const nearbyKm = useMemo(
    () => new Map(nearby.map(({ other, km }) => [other.id, km])),
    [nearby],
  );

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

  const tags = readableTags(place.tags);

  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
      >
        <Link
          to="/places"
          className={cn(
            'inline-flex items-center gap-2 rounded-sm transition-colors hover:text-foreground',
            FOCUS_RING,
          )}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Places
        </Link>
        <span aria-hidden="true" className="text-muted-foreground/50">
          /
        </span>
        <span aria-current="page" className="truncate text-foreground">
          {place.nameEn}
        </span>
      </nav>

      <section
        aria-label={`${place.nameEn} on the map`}
        className="overflow-hidden rounded-2xl border bg-card shadow-[0_24px_60px_-48px_rgba(0,0,0,0.5)] lg:grid lg:min-h-[620px] lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
      >
        <div className="flex min-w-0 flex-col border-b lg:order-2 lg:border-b-0 lg:border-l">
          <PlacePhoto key={place.id} place={place} />
          <Identity place={place} />
        </div>
        <div className="min-w-0 lg:order-1">
          <Suspense
            fallback={
              <Skeleton className="h-[380px] rounded-none sm:h-[480px] lg:h-full" />
            }
          >
            <PlaceMap
              key={place.id}
              place={place}
              nearby={nearby}
              formatDistance={formatDistance}
            />
          </Suspense>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <FieldRecord place={place} tags={tags} />
        <Sources place={place} />
      </div>

      {nearby.length > 0 ? (
        <section aria-labelledby="nearby-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className={KICKER}>Around here</p>
              <h2
                id="nearby-heading"
                className="mt-1 text-lg font-semibold tracking-tight"
              >
                Nearby
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground tabular-nums">
              <Navigation className="size-3.5" aria-hidden="true" />
              {nearby.length} closest · straight-line · also on map
            </span>
          </div>
          <PlaceTable
            places={nearby.map((item) => item.other)}
            extra={{
              header: 'Distance',
              render: (other) => formatDistance(nearbyKm.get(other.id) ?? 0),
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
