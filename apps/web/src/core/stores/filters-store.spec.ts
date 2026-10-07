import {
  DEFAULT_PLACE_FILTERS,
  FILTERS_STORAGE_KEY,
  useFiltersStore,
} from './filters-store';

interface PersistedShape {
  state: {
    query: string;
    category: string;
    minRating: number;
    sort: string;
    setFilters?: unknown;
  };
}

describe('filters store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useFiltersStore.setState({ ...DEFAULT_PLACE_FILTERS, resetToken: 0 });
  });

  it('starts with the documented default filters', () => {
    const state = useFiltersStore.getState();

    expect(state.query).toBe('');
    expect(state.category).toBe('all');
    expect(state.minRating).toBe(0);
    expect(state.sort).toBe('rating');
  });

  it('updates only the provided filter fields', () => {
    useFiltersStore.getState().setFilters({ query: 'temple', minRating: 4 });

    const state = useFiltersStore.getState();

    expect(state.query).toBe('temple');
    expect(state.minRating).toBe(4);
    expect(state.category).toBe('all');
    expect(state.sort).toBe('rating');
  });

  it('persists filter values to localStorage without the actions', () => {
    useFiltersStore.getState().setFilters({
      query: 'pokhara',
      category: 'cafe',
      minRating: 4.5,
      sort: 'name',
    });

    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const persisted = JSON.parse(raw ?? '{}') as PersistedShape;

    expect(persisted.state.query).toBe('pokhara');
    expect(persisted.state.category).toBe('cafe');
    expect(persisted.state.minRating).toBe(4.5);
    expect(persisted.state.sort).toBe('name');
    expect(persisted.state.setFilters).toBeUndefined();
  });

  it('restores persisted values when the store module is loaded again', async () => {
    useFiltersStore
      .getState()
      .setFilters({ query: 'lumbini', category: 'heritage', sort: 'name' });

    vi.resetModules();

    const reloaded = await import('./filters-store');
    const state = reloaded.useFiltersStore.getState();

    expect(state.query).toBe('lumbini');
    expect(state.category).toBe('heritage');
    expect(state.sort).toBe('name');
  });

  it('resets to defaults and bumps the reset token', () => {
    useFiltersStore.getState().setFilters({ query: 'abc', category: 'park' });
    const tokenBefore = useFiltersStore.getState().resetToken;

    useFiltersStore.getState().resetFilters();

    const state = useFiltersStore.getState();

    expect(state.query).toBe('');
    expect(state.category).toBe('all');
    expect(state.minRating).toBe(0);
    expect(state.sort).toBe('rating');
    expect(state.resetToken).toBe(tokenBefore + 1);
  });
});
