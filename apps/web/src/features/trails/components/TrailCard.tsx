import { Link } from 'react-router-dom';
import { CalendarDays, Footprints, Mountain } from 'lucide-react';
import type { Trail } from '@/core/api/types';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { DifficultyBadge } from './DifficultyBadge';
import { TrailSparkline } from './TrailSparkline';

export function TrailCard({ trail }: { trail: Trail }) {
  return (
    <Card className="h-full gap-4 transition-colors hover:border-foreground/20">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={trail.difficulty} />
          <Badge variant="secondary">{trail.bestSeason}</Badge>
          {trail.permitRequired ? (
            <Badge variant="outline">Permit required</Badge>
          ) : (
            <Badge variant="outline">No permit</Badge>
          )}
        </div>
        <CardTitle className="text-base leading-snug">
          <Link to={`/trails/${trail.id}`} className="hover:underline">
            {trail.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Footprints className="h-4 w-4" />
            {trail.distanceKm} km
          </span>
          {trail.elevationGainM ? (
            <span className="inline-flex items-center gap-1.5">
              <Mountain className="h-4 w-4" />
              {trail.elevationGainM.toLocaleString()} m
            </span>
          ) : null}
          {trail.days ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {trail.days} days
            </span>
          ) : null}
        </div>
        {trail.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {trail.description}
          </p>
        ) : null}
        <TrailSparkline geometry={trail.geometry} label={trail.name} />
      </CardContent>
    </Card>
  );
}
