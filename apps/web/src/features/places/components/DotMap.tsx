import { useEffect, useRef } from 'react';
import type { Place, PlaceType } from '@/core/api/types';
import { useTheme } from '@/app/theme/ThemeProvider';
import { cn } from '@/core/lib/utils';
import { GROUP_OF, GROUP_ORDER, GROUP_STYLES } from '../lib/groups';

const BOUNDS = { minLng: 80.0, maxLng: 88.25, minLat: 26.3, maxLat: 30.5 };
const COS_LAT = Math.cos((28.4 * Math.PI) / 180);
const ASPECT =
  ((BOUNDS.maxLng - BOUNDS.minLng) * COS_LAT) / (BOUNDS.maxLat - BOUNDS.minLat);

interface DotMapProps {
  places: Place[];
  /** When set, only these types are drawn at full strength. */
  activeTypes?: PlaceType[] | null;
  /** Ring a single location, e.g. on a detail page. */
  focus?: { lat: number; lng: number } | null;
  className?: string;
}

export function DotMap({ places, activeTypes, focus, className }: DotMapProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let frame = 0;
    const draw = () => {
      cancelAnimationFrame(frame);
      // rAF: wait until the theme class has landed on <html>.
      frame = requestAnimationFrame(() => {
        const ctx = canvas.getContext('2d');
        const width = canvas.clientWidth;
        if (!ctx || width === 0) return;
        const height = width / ASPECT;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const css = getComputedStyle(document.documentElement);
        const muted = css.getPropertyValue('--muted-foreground').trim();
        const active = activeTypes ? new Set(activeTypes) : null;
        const size = width > 640 ? 2.4 : 1.8;
        const project = (lat: number, lng: number): [number, number] => [
          ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * width,
          (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) *
            height,
        ];

        const dim: Place[] = [];
        const lit = new Map<string, Place[]>();
        for (const place of places) {
          if (
            place.lng < BOUNDS.minLng ||
            place.lng > BOUNDS.maxLng ||
            place.lat < BOUNDS.minLat ||
            place.lat > BOUNDS.maxLat
          )
            continue;
          if (active && !active.has(place.placeType)) {
            dim.push(place);
            continue;
          }
          const group = GROUP_OF[place.placeType];
          const bucket = lit.get(group) ?? [];
          bucket.push(place);
          lit.set(group, bucket);
        }

        const paint = (items: Place[], color: string, alpha: number) => {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          for (const place of items) {
            const [x, y] = project(place.lat, place.lng);
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
          }
        };

        paint(dim, muted, focus ? 0.35 : 0.22);
        for (const group of GROUP_ORDER) {
          const color = css.getPropertyValue(GROUP_STYLES[group].cssVar).trim();
          paint(lit.get(group) ?? [], color, focus ? 0.35 : 0.85);
        }

        if (focus) {
          const [x, y] = project(focus.lat, focus.lng);
          const fire = css.getPropertyValue('--culture').trim();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = fire;
          ctx.fillStyle = fire;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [places, activeTypes, focus, resolvedTheme]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Map of Nepal drawn from place coordinates"
      className={cn('block w-full', className)}
      style={{ aspectRatio: ASPECT }}
    />
  );
}
