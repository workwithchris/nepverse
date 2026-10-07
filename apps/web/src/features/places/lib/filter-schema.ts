import { z } from 'zod';

export const placeFiltersSchema = z.object({
  query: z.string().max(80, 'Search is limited to 80 characters'),
  category: z.string().min(1, 'Pick a category'),
  minRating: z.coerce.number().min(0).max(5),
  sort: z.enum(['rating', 'name', 'price']),
});

export type PlaceFiltersForm = z.output<typeof placeFiltersSchema>;

export type PlaceFiltersInput = z.input<typeof placeFiltersSchema>;
