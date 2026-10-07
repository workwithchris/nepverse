import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, Navigation, Star } from 'lucide-react';
import { PLACE_TYPE_LABELS, type Place } from '@/core/api/types';
import { cn } from '@/core/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  GROUP_OF,
  GROUP_STYLES,
  readableTags,
} from '@/features/places/lib/groups';

interface PlaceTableProps {
  places: Place[];
  /** Optional extra field, e.g. distance on the nearby list. */
  extra?: { header: string; render: (place: Place) => string };
}

/** Approximate Nepal bounding box, used to place the locator pin. */
const NEPAL_BOUNDS = { minLat: 26.3, maxLat: 30.5, minLng: 80, maxLng: 88.3 };

const clamp = (value: number) => Math.min(96, Math.max(4, value));

function formatCoords(place: Place) {
  const lat = `${Math.abs(place.lat).toFixed(4)}°${place.lat >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(place.lng).toFixed(4)}°${place.lng >= 0 ? 'E' : 'W'}`;
  return `${lat} ${lng}`;
}

export function PlaceTable({ places, extra }: PlaceTableProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Places">
      {places.map((place) => (
        <li key={place.id} className="min-w-0">
          <PlaceCard place={place} extra={extra} />
        </li>
      ))}
    </ul>
  );
}

function PlaceCard({
  place,
  extra,
}: {
  place: Place;
  extra?: PlaceTableProps['extra'];
}) {
  const group = GROUP_STYLES[GROUP_OF[place.placeType]];
  const tags = readableTags(place.tags, 3);
  const coords = formatCoords(place);
  const extraValue = extra ? extra.render(place) : null;
  const rating = place.rating;

  return (
    <article
      className={cn(
        'group relative flex h-full min-h-[7.5rem] overflow-hidden rounded-xl border bg-card text-card-foreground',
        'transition-[border-color,box-shadow,transform] duration-200 motion-safe:hover:-translate-y-px',
        'hover:border-[#205d43]/40 hover:shadow-[0_8px_24px_-12px_rgba(20,56,47,0.35)]',
        'focus-within:ring-2 focus-within:ring-[#0070f3] focus-within:ring-offset-2 focus-within:ring-offset-background',
      )}
    >
      <PlaceThumb place={place} coords={coords} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <span
              className={cn('size-1.5 shrink-0 rounded-full', group.bg)}
              aria-hidden="true"
            />
            <span className="truncate">
              {PLACE_TYPE_LABELS[place.placeType]}
              <span className="sr-only">, {group.label}</span>
            </span>
          </span>
          <ArrowUpRight
            className="size-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-[#205d43] dark:group-hover:text-[#a9d9c4]"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm leading-snug font-semibold tracking-tight group-hover:underline group-hover:decoration-[#205d43]/40 group-hover:underline-offset-2">
            <Link
              to={`/places/${place.id}`}
              aria-label={`View ${place.nameEn} details`}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              {place.nameEn}
            </Link>
          </h3>
          {place.nameNe ? (
            <p lang="ne" className="truncate text-xs text-muted-foreground">
              {place.nameNe}
            </p>
          ) : null}
        </div>

        {place.address ? (
          <p className="flex min-w-0 items-start gap-1 text-xs text-muted-foreground">
            <MapPin
              className="mt-px size-3 shrink-0 opacity-70"
              aria-hidden="true"
            />
            <span className="line-clamp-1">{place.address}</span>
          </p>
        ) : null}

        {tags.length > 0 ? (
          <ul className="flex min-w-0 flex-wrap gap-1" aria-label="Tags">
            {tags.map((tag) => (
              <li
                key={tag}
                className="max-w-full truncate rounded-full bg-[#14382f]/[0.06] px-2 py-0.5 text-[11px] text-[#14382f] first-letter:uppercase dark:bg-[#a9d9c4]/10 dark:text-[#cfe9dc]"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs">
          <span
            className="truncate font-mono text-[10px] text-muted-foreground tabular-nums"
            title={coords}
          >
            <span className="sr-only">Coordinates </span>
            {coords}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {rating != null ? (
              <span className="inline-flex items-center gap-0.5 font-medium tabular-nums">
                <Star
                  className="size-3 fill-amber-400 text-amber-400"
                  aria-hidden="true"
                />
                <span className="sr-only">Rating </span>
                {rating.toFixed(1)}
                {place.reviewCount ? (
                  <span className="font-normal text-muted-foreground">
                    ({place.reviewCount.toLocaleString()})
                  </span>
                ) : null}
              </span>
            ) : null}
            {extra && extraValue ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#0070f3]/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#0060d0] tabular-nums dark:text-[#6fb1ff]">
                <Navigation className="size-3" aria-hidden="true" />
                <span className="sr-only">{extra.header} </span>
                {extraValue}
              </span>
            ) : null}
          </span>
        </div>
        {place.imageUrl ? (
          <p className="relative z-10 mt-1 text-[10px] leading-4 text-muted-foreground">
            Photo:{' '}
            {place.imageAuthor ??
              place.imageAttribution ??
              'author not recorded'}
            {place.imagePageUrl ? (
              <>
                {' · '}
                <a
                  href={place.imagePageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Source
                </a>
              </>
            ) : null}
            {place.imageLicense ? (
              <>
                {' · '}
                {place.imageLicenseUrl ? (
                  <a
                    href={place.imageLicenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {place.imageLicense}
                  </a>
                ) : (
                  place.imageLicense
                )}
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function PlaceThumb({ place, coords }: { place: Place; coords: string }) {
  const [failed, setFailed] = useState(false);
  const group = GROUP_STYLES[GROUP_OF[place.placeType]];

  if (place.imageUrl && !failed) {
    return (
      <div className="relative w-24 shrink-0 overflow-hidden bg-muted sm:w-28">
        <img
          src={place.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.04]"
        />
        <span
          className={cn(
            'absolute top-2 left-2 size-2 rounded-full ring-2 ring-white/80',
            group.bg,
          )}
          aria-hidden="true"
        />
      </div>
    );
  }

  // Honest fallback: an abstract locator showing where in Nepal the place sits.
  const x = clamp(
    ((place.lng - NEPAL_BOUNDS.minLng) /
      (NEPAL_BOUNDS.maxLng - NEPAL_BOUNDS.minLng)) *
      100,
  );
  const y = clamp(
    (1 -
      (place.lat - NEPAL_BOUNDS.minLat) /
        (NEPAL_BOUNDS.maxLat - NEPAL_BOUNDS.minLat)) *
      100,
  );

  return (
    <div
      className="relative w-24 shrink-0 overflow-hidden bg-gradient-to-br from-[#14382f] to-[#205d43] sm:w-28"
      aria-hidden="true"
      title={`No photo · ${coords}`}
    >
      <svg
        className="absolute inset-0 size-full text-white/[0.09]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0 25H100M0 50H100M0 75H100M25 0V100M50 0V100M75 0V100"
          stroke="currentColor"
          strokeWidth="0.6"
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
        <path
          d="M-5 78 C20 60 35 70 55 52 S85 34 105 40 M-5 92 C25 76 40 84 62 66 S90 54 105 58"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
      </svg>
      <span
        className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40"
        style={{ left: `${x}%`, top: `${y}%` }}
      />
      <span
        className={cn(
          'absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/90',
          group.bg,
        )}
        style={{ left: `${x}%`, top: `${y}%` }}
      />
      <span className="absolute right-1.5 bottom-1.5 left-1.5 font-mono text-[8px] leading-tight tracking-[0.12em] text-white/60 uppercase">
        Locator
      </span>
    </div>
  );
}

export function PlaceTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      aria-busy="true"
      aria-label="Loading places"
      role="status"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex min-h-[7.5rem] overflow-hidden rounded-xl border bg-card"
        >
          <Skeleton className="w-24 shrink-0 rounded-none sm:w-28" />
          <div className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="mt-auto flex justify-between gap-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-2.5 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
