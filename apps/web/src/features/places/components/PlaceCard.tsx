import { Link } from 'react-router-dom';
import { PLACE_TYPE_LABELS, type Place } from '@/core/api/types';
import { Badge } from '@/shared/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { RatingStars } from '@/shared/components/RatingStars';

interface PlaceCardProps {
  place: Place;
}

export function PlaceCard({ place }: PlaceCardProps) {
  return (
    <Card className="h-full gap-3 transition-colors hover:border-foreground/20">
      <CardHeader className="gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="secondary" className="shrink-0">
            {PLACE_TYPE_LABELS[place.placeType]}
          </Badge>
          <RatingStars rating={place.rating} count={place.reviewCount} />
        </div>
        <CardTitle className="text-base leading-snug">
          <Link to={`/places/${place.id}`} className="hover:underline">
            {place.nameEn}
          </Link>
        </CardTitle>
        {place.address ? (
          <CardDescription className="text-xs">{place.address}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {place.description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {place.description}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {place.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
