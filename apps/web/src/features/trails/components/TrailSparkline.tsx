import { useMemo } from 'react';
import { cn } from '@/core/lib/utils';

interface TrailSparklineProps {
  geometry: [number, number][];
  label?: string;
  className?: string;
}

const WIDTH = 640;
const HEIGHT = 180;
const PADDING = 16;

function scale(
  value: number,
  min: number,
  max: number,
  targetMin: number,
  targetMax: number,
): number {
  const span = max - min;
  if (span === 0) return (targetMin + targetMax) / 2;
  return targetMin + ((value - min) / span) * (targetMax - targetMin);
}

export function buildTrailPath(geometry: [number, number][]): string {
  if (geometry.length < 2) return '';

  const lngs = geometry.map(([lng]) => lng);
  const lats = geometry.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const points = geometry.map(([lng, lat]) => {
    const x = scale(lng, minLng, maxLng, PADDING, WIDTH - PADDING);
    const y = scale(lat, minLat, maxLat, HEIGHT - PADDING, PADDING);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return `M ${points.join(' L ')}`;
}

export function TrailSparkline({
  geometry,
  label,
  className,
}: TrailSparklineProps) {
  const path = useMemo(() => buildTrailPath(geometry), [geometry]);

  if (!path) return null;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Route profile"
      className={cn('h-auto w-full text-primary', className)}
      preserveAspectRatio="none"
    >
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
        className="stroke-border"
        strokeWidth="1"
      />
      <line
        x1={PADDING}
        y1={PADDING}
        x2={PADDING}
        y2={HEIGHT - PADDING}
        className="stroke-border"
        strokeWidth="1"
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
