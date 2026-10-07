import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlaceSort = 'rating' | 'name' | 'price';

export interface PlaceFilters {
  query: string;
  category: string;
  minRating: number;
  sort: PlaceSort;
}

export const DEFAULT_PLACE_FILTERS: PlaceFilters = {
  query: '',
  category: 'all',
  minRating: 0,
  sort: 'rating',
};

export const FILTERS_STORAGE_KEY = 'nepalverse:place-filters';

interface FiltersState extends PlaceFilters {
  resetToken: number;
  setFilters: (filters: Partial<PlaceFilters>) => void;
  resetFilters: () => void;
}

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_PLACE_FILTERS,
      resetToken: 0,
      setFilters: (filters) => set(filters),
      resetFilters: () =>
        set((state) => ({
          ...DEFAULT_PLACE_FILTERS,
          resetToken: state.resetToken + 1,
        })),
    }),
    {
      name: FILTERS_STORAGE_KEY,
      partialize: (state) => ({
        query: state.query,
        category: state.category,
        minRating: state.minRating,
        sort: state.sort,
      }),
    },
  ),
);
