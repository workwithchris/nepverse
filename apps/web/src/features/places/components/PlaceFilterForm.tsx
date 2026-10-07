import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { RotateCcw } from 'lucide-react';
import { PLACE_TYPE_LABELS, PLACE_TYPES } from '@/core/api/types';
import {
  DEFAULT_PLACE_FILTERS,
  useFiltersStore,
  type PlaceSort,
} from '@/core/stores/filters-store';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  placeFiltersSchema,
  type PlaceFiltersForm,
  type PlaceFiltersInput,
} from '../lib/filter-schema';

const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Any rating' },
  { value: 3, label: '3.0 and up' },
  { value: 3.5, label: '3.5 and up' },
  { value: 4, label: '4.0 and up' },
  { value: 4.5, label: '4.5 and up' },
];

const SORT_OPTIONS: { value: PlaceSort; label: string }[] = [
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'price', label: 'Price (low to high)' },
];

export function PlaceFilterForm() {
  const { query, category, minRating, sort, setFilters, resetFilters } =
    useFiltersStore();
  const resetToken = useFiltersStore((state) => state.resetToken);

  const {
    control,
    register,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<PlaceFiltersInput, unknown, PlaceFiltersForm>({
    resolver: zodResolver(placeFiltersSchema),
    defaultValues: { query, category, minRating, sort },
  });

  useEffect(() => {
    if (resetToken === 0) return;
    reset(DEFAULT_PLACE_FILTERS);
  }, [resetToken, reset]);

  const watched = watch();
  const debouncedQuery = useDebounce(watched.query, 250);
  const debouncedCategory = useDebounce(watched.category, 250);
  const debouncedMinRating = useDebounce(watched.minRating, 250);
  const debouncedSort = useDebounce(watched.sort, 250);

  useEffect(() => {
    setFilters({
      query: debouncedQuery,
      category: debouncedCategory,
      minRating: Number(debouncedMinRating),
      sort: debouncedSort,
    });
  }, [
    debouncedQuery,
    debouncedCategory,
    debouncedMinRating,
    debouncedSort,
    setFilters,
  ]);

  const onSubmit = handleSubmit((values) => setFilters(values));

  const onReset = () => {
    reset(DEFAULT_PLACE_FILTERS);
    resetFilters();
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="place-search">Search</Label>
        <Input
          id="place-search"
          type="search"
          placeholder="Search places, tags or cities"
          {...register('query')}
        />
        {errors.query ? (
          <p className="text-xs text-destructive">{errors.query.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="place-category">Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="place-category" className="w-full sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {PLACE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PLACE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="place-rating">Minimum rating</Label>
        <Controller
          control={control}
          name="minRating"
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
            >
              <SelectTrigger id="place-rating" className="w-full sm:w-36">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="place-sort">Sort by</Label>
        <Controller
          control={control}
          name="sort"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="place-sort" className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <Button type="button" variant="ghost" onClick={onReset}>
        <RotateCcw className="h-4 w-4" />
        Reset
      </Button>
    </form>
  );
}
