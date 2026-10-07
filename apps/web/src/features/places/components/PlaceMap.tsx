import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed, Maximize2 } from 'lucide-react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PLACE_TYPE_LABELS, type Place } from '@/core/api/types';
import { GROUP_OF, GROUP_STYLES } from '@/features/places/lib/groups';

const FOCUS_ZOOM = 16;
const MARKER_FOCUS =
  'rounded-full outline-none focus-visible:ring-4 focus-visible:ring-black/60';

interface PlaceMapProps {
  place: Place;
  nearby: { other: Place; km: number }[];
  formatDistance: (km: number) => string;
}

function dot(color: string, size: number, ring: string) {
  const el = document.createElement('span');
  el.style.cssText = `display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 0 0 ${ring};`;
  return el;
}

export function PlaceMap({ place, nearby, formatDistance }: PlaceMapProps) {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const nearbyBounds = useRef<L.LatLngBounds | null>(null);
  const color = `var(${GROUP_STYLES[GROUP_OF[place.placeType]].cssVar})`;

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, {
      scrollWheelZoom: false,
      zoomControl: false,
    }).setView([place.lat, place.lng], FOCUS_ZOOM);
    mapRef.current = map;
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const label = document.createElement('span');
    label.textContent = place.nameEn;
    L.marker([place.lat, place.lng], {
      icon: L.divIcon({
        className: '',
        html: dot(color, 24, '6px rgba(0,0,0,.18)'),
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      keyboard: false,
      interactive: false,
      zIndexOffset: 1000,
    })
      .bindTooltip(label, {
        permanent: true,
        direction: 'top',
        offset: [0, -14],
      })
      .addTo(map);

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer?.observe(container.current);
    return () => {
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [place.id, place.lat, place.lng, place.nameEn, color]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    const points: L.LatLngExpression[] = [[place.lat, place.lng]];
    for (const { other, km } of nearby) {
      const url = `/places/${encodeURIComponent(other.id)}`;
      const popup = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = other.nameEn;
      const detail = document.createElement('p');
      detail.style.margin = '4px 0 6px';
      detail.textContent = `${PLACE_TYPE_LABELS[other.placeType]} · ${formatDistance(km)} away`;
      const link = document.createElement('a');
      link.href = url;
      link.textContent = 'View place details';
      link.addEventListener('click', (event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        navigate(url);
      });
      popup.append(name, detail, link);

      const title = `${other.nameEn}, ${formatDistance(km)} away`;
      const marker = L.marker([other.lat, other.lng], {
        icon: L.divIcon({
          className: MARKER_FOCUS,
          html: dot(
            `var(${GROUP_STYLES[GROUP_OF[other.placeType]].cssVar})`,
            16,
            '1px rgba(0,0,0,.25)',
          ),
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
        title,
      })
        .bindPopup(popup)
        .addTo(layer);
      marker.getElement()?.setAttribute('aria-label', title);
      points.push([other.lat, other.lng]);
    }
    nearbyBounds.current = nearby.length ? L.latLngBounds(points) : null;
    return () => {
      layer.remove();
      nearbyBounds.current = null;
    };
  }, [
    place.id,
    place.lat,
    place.lng,
    place.nameEn,
    color,
    nearby,
    formatDistance,
    navigate,
  ]);

  const buttonClass =
    'pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-md transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none';

  return (
    <div className="relative h-full">
      <div
        ref={container}
        role="region"
        aria-label={`Interactive map centred on ${place.nameEn}. Use arrow keys to pan, plus and minus to zoom; tab to reach nearby place markers.`}
        className="relative isolate z-0 h-[380px] w-full bg-muted sm:h-[480px] lg:h-full"
      />
      <div className="pointer-events-none absolute right-4 bottom-7 left-4 z-10 flex flex-wrap items-end justify-between gap-2">
        <span className="hidden rounded-lg border border-white/80 bg-white/95 px-3 py-2 text-[11px] text-neutral-700 shadow-sm backdrop-blur sm:inline">
          Drag to pan · + / − to zoom
        </span>
        <span className="flex gap-2">
          {nearby.length > 0 ? (
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                if (nearbyBounds.current)
                  mapRef.current?.fitBounds(nearbyBounds.current, {
                    padding: [40, 40],
                    maxZoom: FOCUS_ZOOM,
                  });
              }}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
              Show nearby
            </button>
          ) : null}
          <button
            type="button"
            className={buttonClass}
            onClick={() =>
              mapRef.current?.setView([place.lat, place.lng], FOCUS_ZOOM)
            }
          >
            <LocateFixed className="size-4" aria-hidden="true" />
            Recenter
          </button>
        </span>
      </div>
    </div>
  );
}
