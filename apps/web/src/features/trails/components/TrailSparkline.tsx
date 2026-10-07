import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/core/lib/utils';

interface TrailSparklineProps {
  geometry: [number, number][];
  label?: string;
  className?: string;
  large?: boolean;
}

const TILE_SIZE = 256;

// ponytail: export flattens OSM ways; split jumps >1 km until way boundaries are preserved.
export function isTrailGap(a: [number, number], b: [number, number]): boolean {
  return (
    Math.hypot((b[0] - a[0]) * Math.cos((b[1] * Math.PI) / 180), b[1] - a[1]) *
      111.2 >
    1
  );
}

function project([lng, lat]: [number, number]): [number, number] {
  const radians = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return [
    ((lng + 180) / 360) * TILE_SIZE,
    ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * TILE_SIZE,
  ];
}

export function buildTrailMap(
  geometry: [number, number][],
  width: number,
  height: number,
) {
  if (geometry.length < 2) return null;

  const points = geometry.map(project);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const zoom = Math.max(
    3,
    Math.min(
      18,
      Math.floor(
        Math.log2(
          Math.min(
            (width - 32) / (maxX - minX || 1 / 2 ** 18),
            (height - 32) / (maxY - minY || 1 / 2 ** 18),
          ),
        ),
      ),
    ),
  );
  const scale = 2 ** zoom;
  const left = ((minX + maxX) / 2) * scale - width / 2;
  const top = ((minY + maxY) / 2) * scale - height / 2;
  const tiles: { x: number; y: number; url: string }[] = [];
  for (let y = Math.floor(top / TILE_SIZE); y * TILE_SIZE < top + height; y++) {
    for (
      let x = Math.floor(left / TILE_SIZE);
      x * TILE_SIZE < left + width;
      x++
    ) {
      if (x < 0 || x >= 2 ** zoom || y < 0 || y >= 2 ** zoom) continue;
      tiles.push({
        x: x * TILE_SIZE - left,
        y: y * TILE_SIZE - top,
        url: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
      });
    }
  }

  const path = geometry
    .map((point, index) => {
      const [x, y] = points[index];
      return `${index === 0 || isTrailGap(geometry[index - 1], point) ? 'M' : 'L'} ${(x * scale - left).toFixed(1)} ${(y * scale - top).toFixed(1)}`;
    })
    .join(' ');

  const [firstX, firstY] = points[0];
  const [lastX, lastY] = points[points.length - 1];
  const first = geometry[0];
  const last = geometry[geometry.length - 1];
  const loop =
    Math.hypot(
      (last[0] - first[0]) * Math.cos((first[1] * Math.PI) / 180),
      last[1] - first[1],
    ) *
      111.2 <
    0.05;
  return {
    tiles,
    path,
    zoom,
    loop,
    start: [firstX * scale - left, firstY * scale - top],
    finish: [lastX * scale - left, lastY * scale - top],
  };
}

export function TrailSparkline({
  geometry,
  label,
  className,
  large = false,
}: TrailSparklineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    typeof IntersectionObserver === 'undefined',
  );
  const width = large ? 960 : 320;
  const height = large ? 480 : 180;

  useEffect(() => {
    if (large || visible || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [large, visible]);

  const map = useMemo(
    () => (large || visible ? buildTrailMap(geometry, width, height) : null),
    [geometry, width, height, large, visible],
  );

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      <div
        className="relative overflow-hidden rounded-md bg-muted"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {map ? (
          <>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="block w-full"
              role="img"
              aria-label={`${label ?? 'Trail'} route map with start and finish markers`}
            >
              {map.tiles.map((tile) => (
                <image
                  key={tile.url}
                  href={tile.url}
                  x={tile.x}
                  y={tile.y}
                  width={TILE_SIZE}
                  height={TILE_SIZE}
                />
              ))}
              <path
                d={map.path}
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d={map.path}
                fill="none"
                className="stroke-stay"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={map.start[0]}
                cy={map.start[1]}
                r="10"
                fill="#171717"
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={map.start[0]}
                y={map.start[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="9"
                fontWeight="bold"
              >
                {map.loop ? 'S/F' : 'S'}
              </text>
              {!map.loop ? (
                <>
                  <circle
                    cx={map.finish[0]}
                    cy={map.finish[1]}
                    r="10"
                    fill="#e5484d"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={map.finish[0]}
                    y={map.finish[1]}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    F
                  </text>
                </>
              ) : null}
            </svg>
            <a
              href="https://www.openstreetmap.org/copyright"
              tabIndex={-1}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-1 bottom-1 z-10 rounded-sm bg-white/90 px-1 text-[10px] text-neutral-800 hover:underline"
            >
              © OpenStreetMap contributors
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}
