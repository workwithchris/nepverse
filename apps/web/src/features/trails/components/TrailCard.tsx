import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Trail } from '@/core/api/types';
import { DifficultyBadge } from './DifficultyBadge';
import { TrailSparkline } from './TrailSparkline';

export function TrailCard({ trail }: { trail: Trail }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-[#205d43]/50 hover:shadow-lg focus-within:ring-2 focus-within:ring-[#205d43] focus-within:ring-offset-2">
      <TrailSparkline geometry={trail.geometry} label={trail.name} />
      <div className="flex flex-1 flex-col px-2 pt-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DifficultyBadge difficulty={trail.difficulty} />
          <span className="font-mono text-[10px] text-muted-foreground">
            {trail.bestSeason}
          </span>
        </div>
        <h3 className="mt-3 text-lg leading-snug font-semibold tracking-tight text-balance">
          <Link
            to={`/trails/${trail.id}`}
            className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4"
          >
            {trail.name}
          </Link>
        </h3>
        {trail.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {trail.description}
          </p>
        ) : null}
        <div className="mt-auto grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Distance
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">
              {trail.distanceKm}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                km
              </span>
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Estimated time
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">
              {trail.days ?? '—'}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                days
              </span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs">
          <span className="text-muted-foreground">
            {trail.permitRequired ? 'Permit flagged' : 'Verify permits'}
            {trail.elevationGainM
              ? ` · ${trail.elevationGainM.toLocaleString()} m gain`
              : ''}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-[#205d43] dark:text-[#a9d9c4]">
            Explore <ArrowUpRight className="size-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
