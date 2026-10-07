import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed } from 'lucide-react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { distanceKm } from '@/features/places/lib/groups';
import { isTrailGap } from './TrailSparkline';
import type { TrailStop } from './trail-stops';

interface TrailInteractiveMapProps {
  geometry: [number, number][];
  label: string;
  stops: TrailStop[];
  showHighlights: boolean;
  showStays: boolean;
  selectedPlace: { id: string } | null;
}

export function TrailInteractiveMap({
  geometry,
  label,
  stops,
  showHighlights,
  showStays,
  selectedPlace,
}: TrailInteractiveMapProps) {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const markersRef = useRef(new Map<string, L.CircleMarker>());

  useEffect(() => {
    if (!container.current || geometry.length < 2) return;
    const map = L.map(container.current, {
      scrollWheelZoom: false,
      zoomControl: false,
    });
    mapRef.current = map;
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const segments: L.LatLngExpression[][] = [];
    let segment: L.LatLngExpression[] = [];
    for (let i = 0; i < geometry.length; i++) {
      if (i > 0 && isTrailGap(geometry[i - 1], geometry[i])) {
        if (segment.length > 1) segments.push(segment);
        segment = [];
      }
      const [lng, lat] = geometry[i];
      segment.push([lat, lng]);
    }
    if (segment.length > 1) segments.push(segment);
    const route = L.polyline(segments, {
      color: '#0070f3',
      weight: 4,
      opacity: 0.9,
    }).addTo(map);
    const first = geometry[0];
    const last = geometry[geometry.length - 1];
    const marker = (point: [number, number], text: string, color: string) => {
      L.circleMarker([point[1], point[0]], {
        radius: 9,
        color: '#fff',
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindTooltip(text, {
          permanent: true,
          direction: 'top',
          offset: [0, -9],
        })
        .addTo(map);
    };
    const isLoop =
      distanceKm(
        { lat: first[1], lng: first[0] },
        { lat: last[1], lng: last[0] },
      ) < 0.05;
    marker(first, isLoop ? 'Mapped start / finish' : 'Mapped start', '#171717');
    if (!isLoop) marker(last, 'Mapped finish', '#e5484d');
    const bounds = route.getBounds().isValid()
      ? route.getBounds()
      : L.latLngBounds([
          [first[1], first[0]],
          [last[1], last[0]],
        ]);
    boundsRef.current = bounds;
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    return () => {
      map.remove();
      mapRef.current = null;
      boundsRef.current = null;
    };
  }, [geometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    const markers = markersRef.current;
    for (const stop of stops) {
      if (stop.kind === 'highlight' ? !showHighlights : !showStays) continue;
      const { place } = stop;
      const color =
        stop.kind === 'highlight'
          ? '#45a557'
          : stop.kind === 'tea house'
            ? '#f5a623'
            : '#0070f3';
      const popup = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = place.nameEn;
      const detail = document.createElement('p');
      detail.textContent = `${stop.kind === 'highlight' ? 'Nearby highlight' : stop.kind === 'tea house' ? 'Tea house' : 'Stay'} · ${stop.distance.toFixed(1)} km from route`;
      const link = document.createElement('a');
      const placeUrl = `/places/${encodeURIComponent(place.id)}`;
      link.href = placeUrl;
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
        navigate(placeUrl);
      });
      popup.append(name, detail, link);
      const marker = L.circleMarker([place.lat, place.lng], {
        radius: 7,
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(popup)
        .addTo(layer);
      markers.set(place.id, marker);
    }
    return () => {
      layer.remove();
      markers.clear();
    };
  }, [stops, showHighlights, showStays, navigate]);

  useEffect(() => {
    if (!selectedPlace) return;
    const marker = markersRef.current.get(selectedPlace.id);
    const map = mapRef.current;
    if (marker && map) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14));
      marker.openPopup();
    }
  }, [selectedPlace]);

  return (
    <div className="relative h-full">
      <div
        ref={container}
        role="region"
        aria-label={`Interactive map of ${label}`}
        className="relative isolate z-0 h-[440px] w-full bg-muted sm:h-[560px] lg:h-full"
      />
      <div className="pointer-events-none absolute top-4 left-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 text-[11px] font-semibold tracking-wide text-neutral-800 shadow-md backdrop-blur">
        <span className="size-2 rounded-full bg-[#0070f3] ring-2 ring-[#0070f3]/20" />
        MAPPED ROUTE
      </div>
      <div className="pointer-events-none absolute right-4 bottom-7 left-4 z-10 flex flex-wrap items-end justify-between gap-2">
        <span className="rounded-lg border border-white/80 bg-white/95 px-3 py-2 text-[11px] text-neutral-700 shadow-sm backdrop-blur">
          Drag to pan · + / − to zoom
        </span>
        <button
          type="button"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-md transition-colors hover:bg-neutral-100"
          onClick={() => {
            if (boundsRef.current)
              mapRef.current?.fitBounds(boundsRef.current, {
                padding: [32, 32],
                maxZoom: 15,
              });
          }}
        >
          <LocateFixed className="size-4" />
          Fit route
        </button>
      </div>
    </div>
  );
}
