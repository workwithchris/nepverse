import { Star } from 'lucide-react';
import { cn } from '@/core/lib/utils';

interface RatingStarsProps {
  rating?: number | null;
  count?: number | null;
  className?: string;
}

const STAR_POSITIONS = [1, 2, 3, 4, 5];

export function RatingStars({ rating, count, className }: RatingStarsProps) {
  if (rating == null) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        No rating
      </span>
    );
  }

  const rounded = Math.round(rating);

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      <span
        className="inline-flex items-center gap-0.5"
        aria-label={`Rated ${rating} out of 5`}
        role="img"
      >
        {STAR_POSITIONS.map((position) => (
          <Star
            key={position}
            className={cn(
              'h-3.5 w-3.5',
              position <= rounded
                ? 'fill-eat text-eat'
                : 'fill-muted text-muted-foreground/40',
            )}
          />
        ))}
      </span>
      <span className="font-medium tabular-nums">{rating.toFixed(1)}</span>
      {count != null ? (
        <span className="text-muted-foreground tabular-nums">
          ({count.toLocaleString()})
        </span>
      ) : null}
    </span>
  );
}
