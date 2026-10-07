import { PLACE_TYPE_LABELS, type PlaceType } from '@/core/api/types';

interface CategoryBreakdownProps {
  byType: Record<string, number>;
}

function labelFor(type: string): string {
  return type in PLACE_TYPE_LABELS
    ? PLACE_TYPE_LABELS[type as PlaceType]
    : type;
}

export function CategoryBreakdown({ byType }: CategoryBreakdownProps) {
  const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, count]) => count), 1);

  return (
    <div className="space-y-4">
      {entries.map(([type, count]) => (
        <div key={type} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span>{labelFor(type)}</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {count}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round((count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
