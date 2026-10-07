import { Link } from 'react-router-dom';
import { PLACE_TYPE_LABELS, type PlaceType } from '@/core/api/types';
import { cn } from '@/core/lib/utils';
import {
  GROUP_OF,
  GROUP_ORDER,
  GROUP_STYLES,
} from '@/features/places/lib/groups';

interface CategoryBreakdownProps {
  byType: Record<string, number>;
  /** Called with the hovered/focused type, or null on leave. */
  onActiveChange?: (types: PlaceType[] | null) => void;
}

function isPlaceType(type: string): type is PlaceType {
  return type in PLACE_TYPE_LABELS;
}

export function CategoryBreakdown({
  byType,
  onActiveChange,
}: CategoryBreakdownProps) {
  const entries = Object.entries(byType).filter(([type]) =>
    isPlaceType(type),
  ) as [PlaceType, number][];
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;

  return (
    <div className="space-y-5">
      {GROUP_ORDER.map((group) => {
        const rows = entries
          .filter(([type]) => GROUP_OF[type] === group)
          .sort((a, b) => b[1] - a[1]);
        if (rows.length === 0) return null;
        const style = GROUP_STYLES[group];
        const groupTotal = rows.reduce((sum, [, count]) => sum + count, 0);

        return (
          <div key={group}>
            <div className="flex items-center justify-between pb-1 text-sm font-medium">
              <span className="flex items-center gap-2">
                <span
                  className={cn('h-2 w-2 rounded-full', style.bg)}
                  aria-hidden="true"
                />
                {style.label}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {groupTotal.toLocaleString()}
              </span>
            </div>
            <ul>
              {rows.map(([type, count]) => (
                <li key={type}>
                  <Link
                    to={`/places?category=${type}`}
                    onMouseEnter={() => onActiveChange?.([type])}
                    onMouseLeave={() => onActiveChange?.(null)}
                    onFocus={() => onActiveChange?.([type])}
                    onBlur={() => onActiveChange?.(null)}
                    className="group -mx-2 block rounded-md px-2 py-1.5 hover:bg-accent"
                  >
                    <span className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground group-hover:text-foreground">
                        {PLACE_TYPE_LABELS[type]}
                      </span>
                      <span className="tabular-nums">
                        {count.toLocaleString()}
                        <span className="ml-2 inline-block w-9 text-right text-xs text-muted-foreground">
                          {((count / total) * 100).toFixed(1)}%
                        </span>
                      </span>
                    </span>
                    <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-secondary">
                      <span
                        className={cn('block h-full rounded-full', style.bg)}
                        style={{
                          width: `${Math.max(2, (count / total) * 100)}%`,
                        }}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
