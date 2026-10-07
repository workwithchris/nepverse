import {
  TRAIL_DIFFICULTY_LABELS,
  type TrailDifficulty,
} from '@/core/api/types';
import { cn } from '@/core/lib/utils';

const DIFFICULTY_DOTS: Record<TrailDifficulty, string> = {
  easy: 'bg-nature',
  moderate: 'bg-eat',
  hard: 'bg-culture',
  extreme: 'bg-foreground',
};

export function DifficultyBadge({
  difficulty,
}: {
  difficulty: TrailDifficulty;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={cn('h-2 w-2 rounded-full', DIFFICULTY_DOTS[difficulty])}
        aria-hidden="true"
      />
      {TRAIL_DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
