import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/core/lib/utils';

interface LoadingGridProps {
  count?: number;
  className?: string;
}

export function LoadingGrid({ count = 6, className }: LoadingGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
      aria-busy="true"
      aria-label="Loading results"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-3 rounded-lg border bg-card p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
