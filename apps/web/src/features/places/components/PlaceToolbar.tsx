import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { PLACE_TYPE_LABELS, PLACE_TYPES, type Place } from '@/core/api/types';
import { useFiltersStore, type PlaceSort } from '@/core/stores/filters-store';
import { cn } from '@/core/lib/utils';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { GROUP_OF, GROUP_STYLES } from '../lib/groups';

interface PlaceToolbarProps {
  /** Places matching the search and rating filters, before category. */
  scoped: Place[];
  hasRatings: boolean;
}

const RATING_OPTIONS = [
  { value: 0, label: 'Any rating' },
  { value: 3, label: '3.0 and up' },
  { value: 4, label: '4.0 and up' },
  { value: 4.5, label: '4.5 and up' },
];

export function PlaceToolbar({ scoped, hasRatings }: PlaceToolbarProps) {
  const { query, category, minRating, sort, setFilters } = useFiltersStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(query);
  const debounced = useDebounce(text, 200);

  // Store changed elsewhere (URL params, reset): mirror it.
  useEffect(() => setText(query), [query]);
  useEffect(() => {
    if (debounced !== query) setFilters({ query: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // "/" jumps to search, like most dashboards.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== '/' || /INPUT|TEXTAREA|SELECT/.test(target.tagName))
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const counts: Record<string, number> = {};
  for (const place of scoped) {
    counts[place.placeType] = (counts[place.placeType] ?? 0) + 1;
  }
  const sortOptions: { value: PlaceSort; label: string }[] = [
    ...(hasRatings ? [{ value: 'rating' as const, label: 'Top rated' }] : []),
    { value: 'name', label: 'Name (A–Z)' },
    ...(scoped.some((place) => place.priceLevel != null)
      ? [{ value: 'price' as const, label: 'Price (low to high)' }]
      : []),
  ];
  const sortValue = sortOptions.some((o) => o.value === sort) ? sort : 'name';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Search by name, tag or address"
            aria-label="Search places"
            className="h-10 rounded-lg px-9"
          />
          {text ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setText('');
                setFilters({ query: '' });
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground sm:block">
              /
            </kbd>
          )}
        </div>

        {hasRatings ? (
          <Select
            value={String(minRating)}
            onValueChange={(value) => setFilters({ minRating: Number(value) })}
          >
            <SelectTrigger
              aria-label="Minimum rating"
              className="h-10 rounded-lg sm:w-36"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATING_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={sortValue}
          onValueChange={(value) => setFilters({ sort: value as PlaceSort })}
        >
          <SelectTrigger
            aria-label="Sort by"
            className="h-10 rounded-lg sm:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        role="group"
        aria-label="Category"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <Chip
          label="All"
          count={scoped.length}
          selected={category === 'all'}
          onClick={() => setFilters({ category: 'all' })}
        />
        {PLACE_TYPES.filter((type) => counts[type]).map((type) => (
          <Chip
            key={type}
            label={PLACE_TYPE_LABELS[type]}
            count={counts[type]}
            dot={GROUP_STYLES[GROUP_OF[type]].bg}
            selected={category === type}
            onClick={() => setFilters({ category: type })}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  count,
  dot,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  dot?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm transition-colors',
        selected
          ? 'border-[#205d43] bg-[#205d43] text-white'
          : 'bg-card text-muted-foreground hover:border-[#205d43]/50 hover:text-foreground',
      )}
    >
      {dot ? (
        <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden="true" />
      ) : null}
      {label}
      <span
        className={cn(
          'text-xs tabular-nums',
          selected ? 'text-white/70' : 'text-muted-foreground',
        )}
      >
        {count.toLocaleString()}
      </span>
    </button>
  );
}
