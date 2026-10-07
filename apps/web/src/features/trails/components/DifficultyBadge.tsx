import {
  TRAIL_DIFFICULTY_LABELS,
  type TrailDifficulty,
} from '@/core/api/types';
import { cn } from '@/core/lib/utils';
import { Badge } from '@/shared/ui/badge';

const DIFFICULTY_STYLES: Record<TrailDifficulty, string> = {
  easy: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  moderate:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  hard: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400',
  extreme:
    'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

export function DifficultyBadge({
  difficulty,
}: {
  difficulty: TrailDifficulty;
}) {
  return (
    <Badge variant="outline" className={cn(DIFFICULTY_STYLES[difficulty])}>
      {TRAIL_DIFFICULTY_LABELS[difficulty]}
    </Badge>
  );
}
